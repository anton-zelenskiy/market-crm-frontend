import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Form,
} from 'antd'
import {
  ArrowLeftOutlined,
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

const { Title } = Typography
const { Option } = Select

const ConnectionDetail: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [settings, setSettings] = useState<ConnectionSettings | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [runningReportId, setRunningReportId] = useState<number | null>(null)
  const [encoding, setEncoding] = useState<'cp1251' | 'utf-8' | 'utf-8-sig'>('utf-8-sig')
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

      // Load all reports and filter by connection's data source
      const allReports = await reportsApi.getAll()
      setReports(allReports.filter(r => r.data_source_id === conn.data_source_id))
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных подключения')
      navigate('/connections')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSettings = async (values: { logistics_distance: number }) => {
    if (!connectionId || !connection) return

    setSavingSettings(true)
    try {
      const updated = await connectionSettingsApi.update(parseInt(connectionId), {
        logistics_distance: values.logistics_distance,
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
      const blob = await reportsApi.run({
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
      render: (type: string) => <Tag color="blue">{type}</Tag>,
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

  if (!connection || !settings) {
    return null
  }

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/connections')}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                <LinkOutlined /> API Подключение: {company ? `${company.name} (${connection.data_source?.title})`: connection.data_source?.title}
              </Title>
            </Space>
          </div>

          {connection.data_source?.name === 'ozon' && (
            <Card size="small">
              <List
                itemLayout="horizontal"
                dataSource={[
                  {
                    title: 'Формирование поставок',
                    description: 'Планируйте и создавайте поставки на основе остатков и доступности складов',
                    buttonText: 'Поставки',
                    onClick: () => navigate(`/connections/${connection.id}/supply-templates`),
                  },
                  {
                    title: 'Товары Ozon',
                    description: 'Используйте раздел для заполнения кратности товаров.',
                    buttonText: 'Товары Ozon',
                    onClick: () => navigate(`/connections/${connection.id}/ozon-products`),
                  },
                  {
                    title: 'Поставки Ozon',
                    description: 'Работа с поставками: создание грузомест, формирование документов к поставке.',
                    buttonText: 'Поставки Ozon',
                    onClick: () => navigate(`/connections/${connection.id}/supplies`),
                  },
                ]}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button type="primary" onClick={item.onClick} style={{ width: 140 }}>
                        {item.buttonText}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={<strong>{item.title}</strong>}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Card title="Настройки поставки" size="small">
            <Form
              key={`${connection.id}-${settings.id}`}
              form={form}
              layout="inline"
              onFinish={handleUpdateSettings}
              initialValues={{ logistics_distance: settings.logistics_distance }}
            >
              <Form.Item
                name="logistics_distance"
                label="Плечо логистики (дней)"
                rules={[{ required: true, message: 'Введите количество дней' }]}
              >
                <InputNumber min={1} max={365} />
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
          </Card>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>Доступные отчеты</Title>
              <Select
                value={encoding}
                onChange={(value) => setEncoding(value)}
                style={{ width: 250 }}
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
              locale={{ emptyText: 'Нет доступных отчетов для этого источника данных' }}
            />
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default ConnectionDetail
