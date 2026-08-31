import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, Typography, Button, Space, Table, message, Breadcrumb, DatePicker } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  fulfillmentSuppliesApi,
  fulfillmentStockApi,
  fulfillmentPaymentsApi,
  type FulfillmentSupplyRow,
  type FulfillmentStockRow,
  type FulfillmentPaymentRow,
  type FulfillmentPaymentCategoryRow,
} from '../api/wbFulfillment'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography
const { RangePicker } = DatePicker

const formatMoney = (v: string | null) => (v == null ? '—' : Number(v).toFixed(2))

const FulfillmentSupplies: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const connId = connectionId ? parseInt(connectionId) : 0

  const [rows, setRows] = useState<FulfillmentSupplyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)

  const [stockRows, setStockRows] = useState<FulfillmentStockRow[]>([])
  const [stockLoading, setStockLoading] = useState(false)

  const [paymentRange, setPaymentRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [paymentRows, setPaymentRows] = useState<FulfillmentPaymentRow[]>([])
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    if (connId) {
      loadData()
      loadStock()
    }
  }, [connId])

  useEffect(() => {
    if (connId) loadPayments()
  }, [connId, paymentRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const connectionData = await connectionsApi.getById(connId)
      if (connectionData.company_id) {
        try {
          setCompany(await companiesApi.getById(connectionData.company_id))
        } catch {
          setCompany(null)
        }
      }
      setRows(await fulfillmentSuppliesApi.getAll(connId))
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки поставок')
    } finally {
      setLoading(false)
    }
  }

  const loadStock = async () => {
    setStockLoading(true)
    try {
      setStockRows(await fulfillmentStockApi.getAll(connId))
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки остатков')
    } finally {
      setStockLoading(false)
    }
  }

  const loadPayments = async () => {
    setPaymentLoading(true)
    try {
      const [dateFrom, dateTo] = paymentRange
      setPaymentRows(
        await fulfillmentPaymentsApi.getAll(
          connId,
          dateFrom.format('YYYY-MM-DD'),
          dateTo.format('YYYY-MM-DD'),
        ),
      )
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки оплат')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleDownloadXlsx = async () => {
    setDownloading(true)
    try {
      await fulfillmentSuppliesApi.downloadXlsx(connId)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка скачивания файла')
    } finally {
      setDownloading(false)
    }
  }

  const columns = [
    { title: 'ID поставки', dataIndex: 'supply_id', key: 'supply_id', width: 160 },
    {
      title: 'Создана',
      dataIndex: 'supply_created_at',
      key: 'supply_created_at',
      width: 160,
      render: (v: string | null) => (v ? new Date(v).toLocaleString('ru-RU') : '—'),
    },
    {
      title: 'Фулфилмент',
      dataIndex: 'fulfillment_name',
      key: 'fulfillment_name',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    { title: 'nmID', dataIndex: 'nm_id', key: 'nm_id', width: 110 },
    {
      title: 'Размер',
      dataIndex: 'tech_size',
      key: 'tech_size',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Категория',
      dataIndex: 'product_category_name',
      key: 'product_category_name',
      render: (v: string | null) => v || <span style={{ color: '#999' }}>—</span>,
    },
    { title: 'Кол-во упаковок', dataIndex: 'package_count', key: 'package_count', width: 130 },
    {
      title: 'Кол-во единиц',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 120,
      render: (v: number | null) => v ?? <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Цена за единицу',
      dataIndex: 'price_per_item',
      key: 'price_per_item',
      width: 130,
      render: formatMoney,
    },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 120,
      render: formatMoney,
    },
  ]

  const stockDateLabels = stockRows[0]?.points.map((p, idx) => {
    const isToday = idx === stockRows[0].points.length - 1
    return isToday ? 'Сегодня' : new Date(p.date).toLocaleDateString('ru-RU')
  }) || []

  const stockByFulfillment = Object.values(
    stockRows.reduce<Record<number, { fulfillment_id: number; fulfillment_name: string; categories: FulfillmentStockRow[] }>>(
      (acc, row) => {
        if (!acc[row.fulfillment_id]) {
          acc[row.fulfillment_id] = {
            fulfillment_id: row.fulfillment_id,
            fulfillment_name: row.fulfillment_name,
            categories: [],
          }
        }
        acc[row.fulfillment_id].categories.push(row)
        return acc
      },
      {},
    ),
  ).map((f) => ({
    ...f,
    points: stockDateLabels.map((_, idx) => ({
      quantity: f.categories.reduce((sum, c) => sum + (c.points[idx]?.quantity ?? 0), 0),
    })),
  }))

  const stockColumns: ColumnsType<(typeof stockByFulfillment)[number]> = [
    { title: 'Фулфилмент', dataIndex: 'fulfillment_name', key: 'fulfillment_name' },
    ...stockDateLabels.map((label, idx) => ({
      title: label,
      key: `point-${idx}`,
      width: 110,
      render: (_: unknown, record: (typeof stockByFulfillment)[number]) =>
        record.points[idx]?.quantity ?? '—',
    })),
  ]

  const stockCategoryColumns: ColumnsType<FulfillmentStockRow> = [
    { title: 'Категория', dataIndex: 'product_category_name', key: 'product_category_name' },
    ...stockDateLabels.map((label, idx) => ({
      title: label,
      key: `cat-point-${idx}`,
      width: 110,
      render: (_: unknown, record: FulfillmentStockRow) => record.points[idx]?.quantity ?? '—',
    })),
  ]

  const paymentColumns = [
    { title: 'Фулфилмент', dataIndex: 'fulfillment_name', key: 'fulfillment_name' },
    { title: 'Кол-во упаковок', dataIndex: 'total_package_count', key: 'total_package_count', width: 140 },
    { title: 'Кол-во единиц', dataIndex: 'total_quantity', key: 'total_quantity', width: 130 },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 140,
      render: formatMoney,
    },
  ]

  const paymentCategoryColumns: ColumnsType<FulfillmentPaymentCategoryRow> = [
    { title: 'Категория', dataIndex: 'product_category_name', key: 'product_category_name' },
    { title: 'Кол-во упаковок', dataIndex: 'package_count', key: 'package_count', width: 140 },
    { title: 'Кол-во единиц', dataIndex: 'total_quantity', key: 'total_quantity', width: 130 },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 140,
      render: formatMoney,
    },
  ]

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%', gap: '24px' }} size="large">
          <div className="crm-split-header">
            <div className="crm-split-header__start">
              <Breadcrumb
                items={[
                  { title: <Link to="/connections">API Подключения</Link> },
                  { title: <Link to={`/connections/${connId}`}>{company?.name || 'Подключение'}</Link> },
                  { title: 'Поставки фулфилментов' },
                ]}
              />
            </div>
            <div className="crm-split-header__end">
              <Button icon={<DownloadOutlined />} loading={downloading} onClick={handleDownloadXlsx}>
                Скачать XLSX
              </Button>
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Поставки фулфилментов{company && ': ' + company.name}
          </Title>

          <div>
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Остатки на складах
            </Typography.Title>
            <Table
              columns={stockColumns}
              dataSource={stockByFulfillment}
              rowKey="fulfillment_id"
              loading={stockLoading}
              pagination={false}
              size="small"
              scroll={{ x: 900 }}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="product_category_id"
                    dataSource={record.categories}
                    columns={stockCategoryColumns}
                  />
                ),
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Оплата фулфилментам
              </Typography.Title>
              <RangePicker
                value={paymentRange}
                onChange={(values) => {
                  if (values && values[0] && values[1]) {
                    setPaymentRange([values[0], values[1]])
                  }
                }}
                format="DD.MM.YYYY"
                allowClear={false}
              />
            </div>
            <Table
              style={{ marginTop: 12 }}
              columns={paymentColumns}
              dataSource={paymentRows}
              rowKey="fulfillment_id"
              loading={paymentLoading}
              pagination={false}
              size="small"
              expandable={{
                expandedRowRender: (record: FulfillmentPaymentRow) => (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="product_category_id"
                    dataSource={record.categories}
                    columns={paymentCategoryColumns}
                  />
                ),
              }}
            />
          </div>

          <Table
            columns={columns}
            dataSource={rows}
            rowKey={(r) => `${r.supply_id}:${r.nm_id}:${r.tech_size}`}
            loading={loading}
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 100, showSizeChanger: true, showTotal: (total) => `Всего ${total} строк` }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default FulfillmentSupplies
