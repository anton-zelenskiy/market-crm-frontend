import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  message,
  Tag,
  Select,
  Spin,
  List,
  InputNumber,
  Input,
  Form,
  Switch,
  Tabs,
  Breadcrumb,
} from 'antd'
import {
  PlayCircleOutlined,
  LinkOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { connectionsApi } from '../api/connections'
import type { Connection } from '../api/connections'
import { connectionSettingsApi } from '../api/connectionSettings'
import type { ConnectionSettings } from '../api/connectionSettings'
import { reportsApi } from '../api/reports'
import type { Report } from '../api/reports'
import { companiesApi } from '../api/companies'
import type { Company } from '../api/companies'
import KaitenIntegrationForm from '../components/KaitenIntegrationForm'
import BookkeepingDdsSettings from '../components/BookkeepingDdsSettings'
import WbAuthModal from '../components/WbAuthModal'

const { Title } = Typography
const { Option } = Select

const PRODUCTS_SUMMARY_COLUMN_OPTIONS: { key: string; label: string }[] = [
  { key: 'status', label: 'Статус' },
  { key: 'offer_id', label: 'Артикул' },
  { key: 'title', label: 'Наименование' },
  { key: 'quantity', label: 'Количество' },
  { key: 'storage_warehouse', label: 'Склад доставки' },
  { key: 'acceptance_date', label: 'Дата приемки' },
  { key: 'drop_off_warehouse_name', label: 'Склад отгрузки' },
  { key: 'shipment_date', label: 'Дата отгрузки' },
  { key: 'supply_number', label: 'Номер поставки' },
  { key: 'supply_cost', label: 'Стоимость поставки' },
  { key: 'external_order_id', label: 'Номер заказа' },
]

const EMPTY_COLUMN_KEY = '__empty__'
// Select needs unique option values, so each empty-column slot in the widget
// gets its own suffixed key; these all collapse back to EMPTY_COLUMN_KEY
// before sending to the backend.
const EMPTY_COLUMN_SLOT_COUNT = 5
const EMPTY_COLUMN_SLOT_KEYS = Array.from(
  { length: EMPTY_COLUMN_SLOT_COUNT },
  (_, i) => `${EMPTY_COLUMN_KEY}${i + 1}`,
)

// Backend stores repeated EMPTY_COLUMN_KEY entries; assign each occurrence
// a distinct slot key in order so the Select can represent them.
const columnsFromBackend = (columns: string[] | null | undefined): string[] => {
  if (!columns || columns.length === 0) {
    return PRODUCTS_SUMMARY_COLUMN_OPTIONS.map((o) => o.key)
  }
  let emptyIndex = 0
  return columns.map((key) => {
    if (key === EMPTY_COLUMN_KEY) {
      const slot = EMPTY_COLUMN_SLOT_KEYS[emptyIndex] ?? EMPTY_COLUMN_KEY
      emptyIndex += 1
      return slot
    }
    return key
  })
}

const columnsToBackend = (columns: string[]): string[] =>
  columns.map((key) => (key.startsWith(EMPTY_COLUMN_KEY) ? EMPTY_COLUMN_KEY : key))

const ConnectionDetail: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [settings, setSettings] = useState<ConnectionSettings | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [runningReportId, setRunningReportId] = useState<number | null>(null)
  const [encoding, setEncoding] = useState<'cp1251' | 'utf-8' | 'utf-8-sig'>('utf-8-sig')
  const [wbAuthModalOpen, setWbAuthModalOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (connectionId) {
      loadData()
    }
  }, [connectionId])

  const loadData = async () => {
    if (!connectionId) return

    setLoading(true)
    try {
      const [conn, settingsData] = await Promise.all([
        connectionsApi.getById(parseInt(connectionId)),
        connectionSettingsApi.getByConnectionId(parseInt(connectionId)),
      ])
      
      setConnection(conn)
      setSettings(settingsData)
      
      const companyData = await companiesApi.getById(conn.company_id)
      setCompany(companyData)

      // Load reports filtered by data source name
      const dataSourceName = conn.data_source?.name
      const filteredReports = await reportsApi.getAll(dataSourceName)
      setReports(filteredReports)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных подключения')
      navigate('/connections')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSettings = async (values: {
    logistics_distance: number
    auto_create_cargoes: boolean
    floor_to_box_count: boolean
    demand: number
    stocks_spreadsheet_id?: string
    stocks_sheet_id?: number
    shipment_date_days_offset?: number
    products_summary_columns?: string[]
  }) => {
    if (!connectionId || !connection) return

    setSavingSettings(true)
    try {
      const updated = await connectionSettingsApi.update(parseInt(connectionId), {
        logistics_distance: values.logistics_distance,
        auto_create_cargoes: values.auto_create_cargoes,
        floor_to_box_count: values.floor_to_box_count,
        demand: values.demand,
        stocks_spreadsheet_id: values.stocks_spreadsheet_id,
        stocks_sheet_id: values.stocks_sheet_id,
        shipment_date_days_offset: values.shipment_date_days_offset,
        products_summary_columns: values.products_summary_columns
          ? columnsToBackend(values.products_summary_columns)
          : undefined,
      })
      setSettings(updated)
      message.success('Настройки успешно сохранены')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка при сохранении настроек')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleRunReport = async (report: Report) => {
    if (!connection) return

    setRunningReportId(report.id)
    try {
      const runFn =
        connection.data_source?.name === 'wildberries' ? reportsApi.runWb : reportsApi.run

      const blob = await runFn({
        connection_id: connection.id,
        report_type: report.report_type,
        encoding,
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename
      const date = new Date().toISOString().split('T')[0]
      const companyName = company ? company.name : 'company'
      const filename = `${report.name}_${companyName}_${date}.csv`
      link.setAttribute('download', filename)

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success(`Отчет "${report.title}" успешно сгенерирован и загружен`)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка выполнения отчета')
    } finally {
      setRunningReportId(null)
    }
  }

  const reportColumns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Тип отчета',
      dataIndex: 'report_type',
      key: 'report_type',
      render: (_: any, record: Report) => <Tag color={record.data_source?.name === "ozon" ? "blue" : "purple"}>{record.report_type}</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: Report) => (
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={runningReportId === record.id}
          onClick={() => handleRunReport(record)}
        >
          Запустить
        </Button>
      ),
    },
  ]

  if (loading && !connection) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!connection || !settings || !company) {
    return null
  }

  const renderActionList = (
    items: { title: string; description: string; buttonText: string; onClick: () => void }[],
  ) => (
    <List
      itemLayout="horizontal"
      dataSource={items}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button type="primary" onClick={item.onClick} style={{ width: 140 }}>
              {item.buttonText}
            </Button>,
          ]}
        >
          <List.Item.Meta title={<strong>{item.title}</strong>} description={item.description} />
        </List.Item>
      )}
    />
  )

  const tabItems = [
    ...(connection.data_source?.name === 'ozon'
      ? [
          {
            key: 'marketplace',
            label: 'Товары и поставки',
            children: renderActionList([
              {
                title: 'Формирование поставок',
                description:
                  'Планируйте и создавайте поставки на основе остатков и доступности складов',
                buttonText: 'Поставки',
                onClick: () => navigate(`/connections/${connection.id}/supply-templates`),
              },
              {
                title: 'Управление товарами поставщика',
                description:
                  'Используйте раздел для заполнения остатков товаров на складах поставщика.',
                buttonText: 'Товары поставщика',
                onClick: () => navigate(`/connections/${connection.id}/vendor-products`),
              },
              {
                title: 'Товары Ozon',
                description: 'Используйте раздел для заполнения кратности товаров.',
                buttonText: 'Товары Ozon',
                onClick: () => navigate(`/connections/${connection.id}/ozon-products`),
              },
              {
                title: 'Поставки Ozon',
                description:
                  'Работа с поставками: создание грузомест, формирование документов к поставке.',
                buttonText: 'Поставки Ozon',
                onClick: () => navigate(`/connections/${connection.id}/supplies`),
              },
              {
                title: 'Кластеры Ozon',
                description:
                  'Приоритеты, доступность и соседние кластеры для расчёта поставок.',
                buttonText: 'Кластеры',
                onClick: () => navigate(`/connections/${connection.id}/ozon-clusters`),
              },
            ]),
          },
        ]
      : []),
    ...(connection.data_source?.name === 'wildberries'
      ? [
          {
            key: 'marketplace',
            label: 'Действия Wildberries',
            children: renderActionList([
              {
                title: 'Авторизация Wildberries',
                description:
                  'Вход в личный кабинет WB по номеру телефона и коду из СМС для работы действий, требующих авторизации.',
                buttonText: 'Авторизоваться',
                onClick: () => setWbAuthModalOpen(true),
              },
              {
                title: 'Товары Wildberries',
                description:
                  'Синхронизация карточек по тегу «В работе» и заполнение кратности (короба).',
                buttonText: 'Товары WB',
                onClick: () => navigate(`/connections/${connection.id}/wb-products`),
              },
              {
                title: 'Запланировать поставку',
                description: 'Забронировать дату поставки (небезопасно)',
                buttonText: 'Запланировать',
                onClick: () => navigate(`/connections/${connection.id}/wb-supply-plans`),
              },
              {
                title: 'Перераспределить остатки',
                description: 'Перемещение товара между складами',
                buttonText: 'Перераспределить',
                onClick: () => navigate(`/connections/${connection.id}/redistribution-orders`),
              },
            ]),
          },
          {
            key: 'fbs',
            label: 'FBS',
            children: renderActionList([
              {
                title: 'Фулфилменты',
                description: 'Организации фулфилмента, склады, тарифы',
                buttonText: 'Фулфилменты',
                onClick: () => navigate(`/connections/${connection.id}/fulfillments`),
              },
              {
                title: 'Категории товаров',
                description: 'Категории для расчёта тарифов фулфилмента',
                buttonText: 'Категории',
                onClick: () => navigate(`/connections/${connection.id}/product-categories`),
              },
              {
                title: 'Заказы FBS',
                description: 'Статусы и история заказов, обрабатываемых фулфилментами',
                buttonText: 'Заказы FBS',
                onClick: () => navigate(`/connections/${connection.id}/fbs-orders`),
              },
              {
                title: 'Поставки',
                description: 'Поставки FBS с расчётом стоимости фулфилмента по тарифам',
                buttonText: 'Поставки',
                onClick: () => navigate(`/connections/${connection.id}/fulfillment-supplies`),
              },
              {
                title: 'Отгрузки товаров',
                description: 'Учёт отгрузок товаров фулфилментам по категориям и датам',
                buttonText: 'Отгрузки',
                onClick: () => navigate(`/connections/${connection.id}/fbs-shipments`),
              },
            ]),
          },
        ]
      : []),
    {
      key: 'finance',
      label: 'Финансы',
      children: (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <BookkeepingDdsSettings connectionId={connection.id} />
          {renderActionList([
            {
              title: 'Банковские операции',
              description:
                'Загрузка выписок (XLSX, PDF), просмотр, фильтры, ручное добавление и экспорт.',
              buttonText: 'Открыть',
              onClick: () => navigate(`/connections/${connection.id}/bookkeeping`),
            },
          ])}
        </Space>
      ),
    },
    ...(connection.data_source?.name === 'ozon' && connectionId
      ? [
          {
            key: 'kaiten',
            label: 'Kaiten',
            children: <KaitenIntegrationForm connectionId={parseInt(connectionId)} />,
          },
        ]
      : []),
    ...(connection.data_source?.name === 'ozon'
      ? [{
      key: 'settings',
      label: 'Настройки поставок',
      children: (
        <Form
          key={`${connection.id}-${settings.id}`}
          form={form}
          layout="vertical"
          onFinish={handleUpdateSettings}
          initialValues={{
            logistics_distance: settings.logistics_distance,
            auto_create_cargoes: settings.auto_create_cargoes,
            floor_to_box_count: settings.floor_to_box_count,
            demand: settings.demand,
            stocks_spreadsheet_id: settings.stocks_spreadsheet_id,
            stocks_sheet_id: settings.stocks_sheet_id,
            shipment_date_days_offset: settings.shipment_date_days_offset ?? 1,
            products_summary_columns: columnsFromBackend(settings.products_summary_columns),
          }}
          style={{ maxWidth: 480 }}
        >
          <Form.Item
            name="logistics_distance"
            label="Плечо логистики (дней)"
            rules={[{ required: true, message: 'Введите количество дней' }]}
          >
            <InputNumber min={1} max={365} />
          </Form.Item>
          <Form.Item
            name="auto_create_cargoes"
            label="Автоматически создавать грузоместа"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="floor_to_box_count"
            label="Округлять до кратности"
            valuePropName="checked"
            tooltip="Округлять количество товаров к поставке до кратности упаковки"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="demand"
            label="Количество товара к поставке по умолчанию"
            rules={[{ required: true, message: 'Введите значение' }]}
            tooltip="Используется при проверке доступности кластеров принять товар"
          >
            <InputNumber min={1} max={1000} />
          </Form.Item>
          <Form.Item
            name="stocks_spreadsheet_id"
            label="ID Google таблицы с остатками"
            tooltip="Идентификатор таблицы из её ссылки: docs.google.com/spreadsheets/d/ЭТОТ_ID/edit"
          >
            <Input placeholder="1AbCDefGhIJKLmnoPQRstuVWxyz" />
          </Form.Item>
          <Form.Item
            name="stocks_sheet_id"
            label="ID листа с остатками (gid)"
            tooltip="Идентификатор листа из ссылки: ...#gid=ЭТОТ_ID. Лист должен содержать колонки «Артикул» и «Кол-во на складе», таблица должна быть доступна по ссылке всем"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item
            name="shipment_date_days_offset"
            label="Смещение даты отгрузки (дней до начала таймслота)"
            rules={[{ required: true, message: 'Введите количество дней' }]}
            tooltip="Дата отгрузки в сводке по товарам = начало таймслота минус это число дней"
          >
            <InputNumber min={0} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="products_summary_columns"
            label="Колонки сводки по товарам"
            tooltip="Порядок реальных колонок фиксирован, выбор влияет только на включение/исключение и расположение пустых колонок. Порядок выбора «Пустой колонки» задаёт её позицию."
          >
            <Select mode="multiple" placeholder="Выберите колонки" allowClear>
              {PRODUCTS_SUMMARY_COLUMN_OPTIONS.map((o) => (
                <Option key={o.key} value={o.key}>
                  {o.label}
                </Option>
              ))}
              {EMPTY_COLUMN_SLOT_KEYS.map((key, i) => (
                <Option key={key} value={key}>
                  {`Пустая колонка ${i + 1}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={savingSettings}
            >
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      ),
    }]
      : []),
    {
      key: 'reports',
      label: 'Отчёты',
      children: (
        <>
          <div className="crm-detail-toolbar" style={{ marginBottom: 16 }}>
            <Select
              value={encoding}
              onChange={(value) => setEncoding(value)}
              style={{ width: 250 }}
              placeholder="Кодировка CSV"
            >
              <Option value="cp1251">CP1251</Option>
              <Option value="utf-8">UTF-8</Option>
              <Option value="utf-8-sig">UTF-8-SIG (Windows)</Option>
            </Select>
          </div>
          <Table
            columns={reportColumns}
            dataSource={reports}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Нет доступных отчетов для этого источника данных' }}
          />
        </>
      ),
    },
  ]

  const hashKey = location.hash.slice(1)
  const activeKey = tabItems.some((item) => item.key === hashKey)
    ? hashKey
    : tabItems[0]?.key

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <div className="crm-page-lead">
            <Breadcrumb
              items={[
                { title: <Link to="/connections">API Подключения</Link> },
                {
                  title: company
                    ? `${company.name} (${connection.data_source?.title})`
                    : connection.data_source?.title,
                },
              ]}
            />
            <Title level={2} style={{ margin: 0 }}>
              <LinkOutlined /> API Подключение:{' '}
              {company
                ? `${company.name} (${connection.data_source?.title})`
                : connection.data_source?.title}
            </Title>
          </div>

          <Tabs
            items={tabItems}
            activeKey={activeKey}
            onChange={(key) => navigate(`${location.pathname}#${key}`, { replace: true })}
          />

        </Space>
      </Card>

      <WbAuthModal
        connectionId={connection.id}
        open={wbAuthModalOpen}
        onClose={() => setWbAuthModalOpen(false)}
      />
    </div>
  )
}

export default ConnectionDetail
