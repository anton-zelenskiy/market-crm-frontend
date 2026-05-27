import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs, { type Dayjs, DATE_FORMAT } from '../lib/dayjs'
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
import type { ColDef, GetRowIdParams, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community'
import {
  bookkeepingApi,
  type FinanceBookkeepingArticle,
  type FinanceOperation,
  type FinanceOperationCreate,
  type FinanceWallet,
  type ListOperationsParams,
} from '../api/bookkeeping'

ModuleRegistry.registerModules([AllCommunityModule])

const { Title } = Typography
const { RangePicker } = DatePicker

const PAIR_ROW_HIGHLIGHT = '#e8f5e9'

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

function buildListParams(
  dateRange: [Dayjs | null, Dayjs | null] | null,
  amountMin: number | null,
  amountMax: number | null,
  walletId: number | undefined,
  sourceFileName: string | undefined,
  search: string
): ListOperationsParams {
  const params: ListOperationsParams = { limit: 500, offset: 0 }
  if (dateRange?.[0]) params.date_from = dateRange[0].format('YYYY-MM-DD')
  if (dateRange?.[1]) params.date_to = dateRange[1].format('YYYY-MM-DD')
  if (amountMin != null) params.amount_min = amountMin
  if (amountMax != null) params.amount_max = amountMax
  if (walletId != null) params.wallet_id = walletId
  if (sourceFileName) params.source_file_name = sourceFileName
  if (search.trim()) params.search = search.trim()
  return params
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
  const gridRef = useRef<AgGridReact<FinanceOperation>>(null)

  const [items, setItems] = useState<FinanceOperation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [amountMin, setAmountMin] = useState<number | null>(null)
  const [amountMax, setAmountMax] = useState<number | null>(null)
  const [walletFilterId, setWalletFilterId] = useState<number | undefined>(undefined)
  const [sourceFileName, setSourceFileName] = useState<string | undefined>(undefined)
  const [sourceFileOptions, setSourceFileOptions] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [highlightPairs, setHighlightPairs] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAllFiltered, setSelectAllFiltered] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceOperation | null>(null)
  const [form] = Form.useForm()
  const [wallets, setWallets] = useState<FinanceWallet[]>([])
  const [articles, setArticles] = useState<FinanceBookkeepingArticle[]>([])

  const listParams = useMemo(
    () => buildListParams(dateRange, amountMin, amountMax, walletFilterId, sourceFileName, search),
    [dateRange, amountMin, amountMax, walletFilterId, sourceFileName, search]
  )

  const loadSourceFiles = useCallback(async () => {
    if (!cid) return
    try {
      const names = await bookkeepingApi.listSourceFileNames(cid)
      setSourceFileOptions(names)
    } catch {
      /* optional */
    }
  }, [cid])

  const load = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    setSelectAllFiltered(false)
    setSelectedIds([])
    try {
      const res = await bookkeepingApi.listOperations(cid, listParams)
      setItems(res.items)
      setTotal(res.total)
      gridRef.current?.api?.deselectAll()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка загрузки операций')
    } finally {
      setLoading(false)
    }
  }, [cid, listParams])

  const loadMeta = useCallback(async () => {
    if (!cid) return
    try {
      const [w, a] = await Promise.all([
        bookkeepingApi.listWallets(cid),
        bookkeepingApi.listBookkeepingArticles(cid),
      ])
      setWallets(w)
      setArticles(a.filter((x) => x.is_active))
    } catch {
      /* settings optional until seeded */
    }
  }, [cid])

  useEffect(() => {
    load()
    loadSourceFiles()
    loadMeta()
  }, [load, loadSourceFiles, loadMeta])

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
        wallet_id: row.wallet_id,
        operation_date: dayjs(row.operation_date),
        amount: parseFloat(row.amount),
        operation_type: row.operation_type,
        payment_details: row.payment_details,
        bookkeeping_article_id: row.bookkeeping_article_id,
        platform: row.platform,
        contractor: row.contractor,
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
        await loadSourceFiles()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string } } }
        message.error(err.response?.data?.detail || 'Ошибка удаления')
      }
    },
    [cid, load, loadSourceFiles]
  )

  const showUploadResult = (files: Record<string, unknown>[], batchCount: number, batchId: number) => {
    const errors = files.filter((f) => f.error)
    if (errors.length === 0) {
      message.success(`Загружено ${batchCount} операций (пакет #${batchId})`)
    } else {
      message.warning(
        `Пакет #${batchId}: ${batchCount} операций. Ошибки в ${errors.length} из ${files.length} файлов`
      )
      Modal.info({
        title: 'Результат загрузки',
        width: 560,
        content: (
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {files.map((f, i) => (
              <li key={i}>
                <strong>{String(f.filename ?? '?')}</strong>
                {f.error
                  ? `: ${String(f.error)}`
                  : ` — ${String(f.inserted ?? 0)} новых, дублей: ${String(f.skipped_duplicate ?? 0)}`}
              </li>
            ))}
          </ul>
        ),
      })
    }
  }

  const handleUploadMany = async (fileList: File[]) => {
    if (!cid || !fileList.length) return
    setUploading(true)
    try {
      const res = await bookkeepingApi.uploadImports(cid, fileList)
      showUploadResult(res.files, res.batch.operations_count, res.batch.id)
      await load()
      await loadSourceFiles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const handleBeforeUpload = (file: UploadFile, fileList: UploadFile[]) => {
    const raw = fileList.map((f) => f as unknown as File)
    if (fileList[fileList.length - 1]?.uid !== file.uid) {
      return false
    }
    void handleUploadMany(raw)
    return false
  }

  const handleExport = async () => {
    if (!cid) return
    setExporting(true)
    try {
      const blob = await bookkeepingApi.exportXlsx(cid, {
        ...listParams,
        include_pairs_preview: true,
      })
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

  const onSelectionChanged = useCallback((e: SelectionChangedEvent<FinanceOperation>) => {
    setSelectAllFiltered(false)
    setSelectedIds(e.api.getSelectedRows().map((r) => r.id))
  }, [])

  const handleSelectAllFiltered = () => {
    setSelectAllFiltered(true)
    gridRef.current?.api?.selectAll()
    setSelectedIds(items.map((o) => o.id))
  }

  const bulkDeleteCount = selectAllFiltered ? total : selectedIds.length

  const handleBulkDelete = async () => {
    if (!cid || bulkDeleteCount === 0) return
    try {
      if (selectAllFiltered) {
        const res = await bookkeepingApi.bulkDeleteOperations(cid, { filters: listParams })
        message.success(`Удалено ${res.deleted} операций`)
      } else {
        const res = await bookkeepingApi.bulkDeleteOperations(cid, { ids: selectedIds })
        message.success(`Удалено ${res.deleted} операций`)
      }
      setSelectedIds([])
      setSelectAllFiltered(false)
      await load()
      await loadSourceFiles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка массового удаления')
    }
  }

  const submitForm = async () => {
    if (!cid) return
    try {
      const v = await form.validateFields()
      const body: FinanceOperationCreate = {
        wallet_id: v.wallet_id,
        operation_date: v.operation_date.format('YYYY-MM-DD'),
        amount: v.amount,
        operation_type: v.operation_type,
        payment_details: v.payment_details || '',
        bookkeeping_article_id: v.bookkeeping_article_id,
        platform: v.platform,
        contractor: v.contractor,
      }
      if (editing) {
        await bookkeepingApi.updateOperation(cid, editing.id, {
          wallet_id: body.wallet_id,
          operation_date: body.operation_date,
          amount: body.amount,
          operation_type: body.operation_type,
          payment_details: body.payment_details,
          bookkeeping_article_id: body.bookkeeping_article_id,
          platform: body.platform,
          contractor: body.contractor,
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

  const articleOptions = useMemo(
    () => articles.map((a) => ({ value: a.id, label: a.name })),
    [articles]
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
        field: 'wallet_name',
        headerName: 'Кошелёк',
        width: 180,
        sortable: true,
        filter: false,
      },
      {
        field: 'bookkeeping_article_name',
        headerName: 'Статья ДДС',
        width: 180,
        sortable: true,
        filter: false,
      },
      {
        field: 'platform',
        headerName: 'Платформа',
        width: 90,
        sortable: true,
        filter: false,
      },
      {
        field: 'operation_type',
        headerName: 'Тип',
        width: 80,
        sortable: true,
        filter: false,
      },
      {
        headerName: 'Сумма',
        width: 120,
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
        minWidth: 180,
        sortable: true,
        filter: false,
        tooltipField: 'payment_details',
      },
      {
        field: 'source_file_name',
        headerName: 'Файл',
        width: 140,
        sortable: true,
        filter: false,
        tooltipField: 'source_file_name',
      },
      {
        headerName: '',
        width: 100,
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
                Банковские операции (ДДС)
              </Title>
            </div>
            <div className="crm-split-header__end">
              <Space wrap>
                <Upload
                  accept=".xlsx,.pdf"
                  multiple
                  showUploadList={false}
                  beforeUpload={handleBeforeUpload}
                  disabled={uploading}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    Загрузить выписку
                  </Button>
                </Upload>
                <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
                  Экспорт
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Добавить
                </Button>
              </Space>
            </div>
          </div>

          <Space wrap align="center">
            <span>Период:</span>
            <RangePicker value={dateRange} onChange={(v) => setDateRange(v)} allowEmpty={[true, true]} format={DATE_FORMAT} />
            <span>Кошелёк</span>
            <Select
              allowClear
              placeholder="все"
              style={{ width: 220 }}
              value={walletFilterId}
              onChange={setWalletFilterId}
              options={wallets.map((w) => ({ value: w.id, label: w.name }))}
            />
            <span>Файл</span>
            <Select
              allowClear
              placeholder="все"
              style={{ width: 180 }}
              value={sourceFileName}
              onChange={setSourceFileName}
              options={sourceFileOptions.map((n) => ({ value: n, label: n }))}
            />
            <span>Сумма от</span>
            <InputNumber min={0} value={amountMin ?? undefined} onChange={(v) => setAmountMin(v)} />
            <span>до</span>
            <InputNumber min={0} value={amountMax ?? undefined} onChange={(v) => setAmountMax(v)} />
            <Input.Search
              placeholder="Сумма или назначение"
              style={{ width: 220 }}
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

          <Space wrap>
            <span>
              Всего: {total}
              {selectAllFiltered && total > items.length
                ? ` (выбраны все по фильтру: ${total})`
                : selectedIds.length > 0
                  ? ` · выбрано: ${bulkDeleteCount}`
                  : ''}
            </span>
            {total > items.length && (
              <Button size="small" onClick={handleSelectAllFiltered}>
                Выбрать все {total} по фильтрам
              </Button>
            )}
            {bulkDeleteCount > 0 && (
              <Popconfirm
                title={
                  selectAllFiltered && total > items.length
                    ? `Удалить все ${total} операций по текущим фильтрам?`
                    : `Удалить ${bulkDeleteCount} выбранных операций?`
                }
                onConfirm={handleBulkDelete}
              >
                <Button danger size="small">
                  Удалить выбранные ({bulkDeleteCount})
                </Button>
              </Popconfirm>
            )}
          </Space>

          <Spin spinning={loading}>
            <div style={{ height: 560, width: '100%' }}>
              <AgGridReact<FinanceOperation>
                ref={gridRef}
                theme={themeAlpine}
                rowData={items}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                getRowStyle={getRowStyle}
                rowSelection={{
                  mode: 'multiRow',
                  checkboxes: true,
                  headerCheckbox: true,
                }}
                onSelectionChanged={onSelectionChanged}
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
          <Form.Item name="wallet_id" label="Кошелёк" rules={[{ required: true }]}>
            <Select
              options={wallets.map((w) => ({ value: w.id, label: w.name }))}
              allowClear={false}
            />
          </Form.Item>
          <Form.Item name="operation_date" label="Дата" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format={DATE_FORMAT} />
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
          <Form.Item name="bookkeeping_article_id" label="Статья ДДС">
            <Select allowClear options={articleOptions} />
          </Form.Item>
          <Form.Item name="platform" label="Платформа">
            <Select
              allowClear
              options={[
                { value: 'WB', label: 'WB' },
                { value: 'OZON', label: 'OZON' },
              ]}
            />
          </Form.Item>
          <Form.Item name="contractor" label="Контрагент">
            <Input />
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
