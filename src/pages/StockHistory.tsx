import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  message,
  DatePicker,
  Select,
  Spin,
  Breadcrumb,
  Checkbox,
} from 'antd'
import dayjs, { type Dayjs, API_DATE_FORMAT, DATE_FORMAT } from '../lib/dayjs'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community'
import type { CellStyle, ColDef, ColGroupDef, GetRowIdParams, ValueFormatterParams } from 'ag-grid-community'
import {
  suppliesApi,
  type ProductStockHistory,
  type StockHistoryGroupBy,
  type StockHistoryPeriod,
  type StockHistoryResponse,
  type StockMetrics,
  type StockType,
} from '../api/supplies'
import { companiesApi } from '../api/companies'
import { connectionsApi } from '../api/connections'

ModuleRegistry.registerModules([AllCommunityModule])

const { Title, Text } = Typography
const { RangePicker } = DatePicker

type MetricKey = keyof StockMetrics

// currentOnly: shown only for the latest period (deficit is actionable only now)
const METRICS: {
  key: MetricKey
  label: string
  decimals: number
  currentOnly?: boolean
}[] = [
  { key: 'stocks_count', label: 'Остаток', decimals: 0 },
  { key: 'ads', label: 'ADS', decimals: 1 },
  { key: 'avg_orders_count', label: 'Ср. заказы в день', decimals: 1 },
  { key: 'idc', label: 'IDC', decimals: 1 },
  { key: 'reserve_in_days', label: 'Запас, дн.', decimals: 1 },
  { key: 'deficit_days', label: 'Дефицит, дн.', decimals: 1, currentOnly: true },
  { key: 'deficit_quantity', label: 'Дефицит, шт.', decimals: 0, currentOnly: true },
  { key: 'to_production', label: 'В производство', decimals: 0, currentOnly: true },
]

const GROUP_BY_OPTIONS: { value: StockHistoryGroupBy; label: string }[] = [
  { value: 'day', label: 'По дням' },
  { value: 'week', label: 'По неделям' },
  { value: 'month', label: 'По месяцам' },
]

const STOCK_TYPE_OPTIONS: { value: StockType; label: string }[] = [
  { value: 'available_stock_count', label: 'Доступно' },
  { value: 'transit_stock_count', label: 'В пути' },
  { value: 'requested_stock_count', label: 'Заявлено к поставке' },
]

const DEFAULT_STOCK_TYPES: StockType[] = ['available_stock_count', 'transit_stock_count']

const DEFICIT_CELL_STYLE: CellStyle = { backgroundColor: '#fff1f0', color: '#cf1322' }

function formatNumber(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function periodHeader(period: StockHistoryPeriod, groupBy: StockHistoryGroupBy): string {
  const from = dayjs(period.date_from)
  const to = dayjs(period.date_to)
  if (from.isSame(to, 'day')) return from.format('DD.MM.YY')
  // Incomplete or partly collected week/month: show the snapshot day
  const snapshot =
    period.snapshot_date && !dayjs(period.snapshot_date).isSame(to, 'day')
      ? ` (на ${dayjs(period.snapshot_date).format('DD.MM')})`
      : ''
  return `${periodRangeLabel(from, to, groupBy)}${snapshot}`
}

function periodRangeLabel(from: Dayjs, to: Dayjs, groupBy: StockHistoryGroupBy): string {
  if (groupBy === 'month' && from.date() === 1 && to.isSame(to.endOf('month'), 'day')) {
    return from.format('MMMM YYYY')
  }
  return `${from.format('DD.MM')}–${to.format('DD.MM.YY')}`
}

const StockHistory: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const cid = connectionId ? parseInt(connectionId, 10) : 0

  const [companyName, setCompanyName] = useState<string | null>(null)
  const [data, setData] = useState<StockHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(13, 'day'),
    dayjs(),
  ])
  const [groupBy, setGroupBy] = useState<StockHistoryGroupBy>('day')
  // Group-by of the loaded data: headers must not change before "Применить"
  const [loadedGroupBy, setLoadedGroupBy] = useState<StockHistoryGroupBy>('day')
  const [stockTypes, setStockTypes] = useState<StockType[]>(DEFAULT_STOCK_TYPES)
  const [visibleMetrics, setVisibleMetrics] = useState<MetricKey[]>(METRICS.map((m) => m.key))

  useEffect(() => {
    if (!cid) return
    connectionsApi
      .getById(cid)
      .then((connection) => companiesApi.getById(connection.company_id))
      .then((company) => setCompanyName(company.name))
      .catch(() => {
        /* breadcrumb only */
      })
  }, [cid])

  const load = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    try {
      const res = await suppliesApi.getStockHistory(cid, {
        date_from: dateRange[0].format(API_DATE_FORMAT),
        date_to: dateRange[1].format(API_DATE_FORMAT),
        group_by: groupBy,
        stock_types: stockTypes,
      })
      setData(res)
      setLoadedGroupBy(groupBy)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const detail = err.response?.data?.detail
      message.error(typeof detail === 'string' ? detail : 'Ошибка загрузки остатков')
    } finally {
      setLoading(false)
    }
  }, [cid, dateRange, groupBy, stockTypes])

  // Initial load; filter changes apply on "Применить"
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  const columnDefs = useMemo<(ColDef<ProductStockHistory> | ColGroupDef<ProductStockHistory>)[]>(() => {
    const metrics = METRICS.filter((m) => visibleMetrics.includes(m.key))
    // Newest period first; deficit metrics only for the latest one
    const periods = [...(data?.periods ?? [])].reverse()
    const periodGroups: ColGroupDef<ProductStockHistory>[] = periods.map((period, index) => ({
      headerName: periodHeader(period, loadedGroupBy),
      headerTooltip: period.snapshot_date
        ? `Остатки на ${dayjs(period.snapshot_date).format(DATE_FORMAT)}`
        : 'Нет данных за период',
      children: metrics.filter((m) => index === 0 || !m.currentOnly).map(
        (metric): ColDef<ProductStockHistory> => ({
          colId: `${period.key}:${metric.key}`,
          headerName: metric.label,
          width: 110,
          type: 'numericColumn',
          valueGetter: (p) => p.data?.metrics[period.key]?.[metric.key] ?? null,
          valueFormatter: (p: ValueFormatterParams<ProductStockHistory, number | null>) =>
            formatNumber(p.value, metric.decimals),
          cellStyle: metric.currentOnly
            ? (p) => (typeof p.value === 'number' && p.value > 0 ? DEFICIT_CELL_STYLE : null)
            : undefined,
        })
      ),
    }))

    return [
      { field: 'offer_id', headerName: 'Артикул', pinned: 'left', width: 140 },
      { field: 'name', headerName: 'Название', pinned: 'left', width: 240, tooltipField: 'name' },
      {
        field: 'vendor_stocks',
        headerName: 'Остаток поставщика',
        pinned: 'left',
        width: 120,
        type: 'numericColumn',
        valueFormatter: (p) => formatNumber(p.value, 0),
      },
      ...periodGroups,
    ]
  }, [data, visibleMetrics, loadedGroupBy])

  const defaultColDef = useMemo<ColDef<ProductStockHistory>>(
    () => ({
      resizable: true,
      sortable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
    }),
    []
  )

  const getRowId = useCallback((p: GetRowIdParams<ProductStockHistory>) => p.data.offer_id, [])

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Breadcrumb
            items={[
              { title: <Link to="/connections">API Подключения</Link> },
              { title: <Link to={`/connections/${connectionId}`}>{companyName || 'Подключение'}</Link> },
              { title: 'Остатки и дефицит' },
            ]}
          />

          <Title level={3} style={{ margin: 0 }}>
            Остатки и дефицит
          </Title>

          <Space wrap align="center">
            <span>Период:</span>
            <RangePicker
              value={dateRange}
              onChange={(v) => {
                if (v?.[0] && v[1]) setDateRange([v[0], v[1]])
              }}
              allowClear={false}
              format={DATE_FORMAT}
              disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            />
            <span>Группировка:</span>
            <Select
              style={{ width: 150 }}
              value={groupBy}
              onChange={setGroupBy}
              options={GROUP_BY_OPTIONS}
            />
            <span>Учитывать остатки:</span>
            <Checkbox.Group
              options={STOCK_TYPE_OPTIONS.map((o) => ({
                ...o,
                // At least one stock type must stay selected
                disabled: stockTypes.length === 1 && stockTypes.includes(o.value),
              }))}
              value={stockTypes}
              onChange={(v) => setStockTypes(v as StockType[])}
            />
            <Button type="primary" onClick={() => load()}>
              Применить
            </Button>
          </Space>

          <Space wrap align="center">
            <span>Показатели:</span>
            <Select
              mode="multiple"
              style={{ minWidth: 360 }}
              value={visibleMetrics}
              onChange={setVisibleMetrics}
              options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
              maxTagCount="responsive"
            />
            {data && (
              <Text type="secondary">
                Плечо поставки: {data.logistics_distance_days} дн. · Товаров: {data.items.length}
              </Text>
            )}
          </Space>

          <Spin spinning={loading}>
            <div style={{ height: 600, width: '100%' }}>
              <AgGridReact<ProductStockHistory>
                theme={themeAlpine}
                rowData={data?.items ?? []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                animateRows={false}
                suppressCellFocus
                rowHeight={40}
                tooltipShowDelay={300}
              />
            </div>
          </Spin>
        </Space>
      </Card>
    </div>
  )
}

export default StockHistory
