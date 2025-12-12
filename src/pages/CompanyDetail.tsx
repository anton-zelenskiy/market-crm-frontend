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
  Descriptions,
  Alert,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  ShopOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { companiesApi } from '../api/companies'
import type { Company } from '../api/companies'
import type { Connection } from '../api/connections'
import { reportsApi } from '../api/reports'
import type { Report } from '../api/reports'

const { Title } = Typography
const { Option } = Select

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [runningReportId, setRunningReportId] = useState<number | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null)
  const [encoding, setEncoding] = useState<'cp1251' | 'utf-8' | 'utf-8-sig'>('utf-8-sig')

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return

    setLoading(true)
    try {
      const companyData = await companiesApi.getById(parseInt(id))
      setCompany(companyData)
      setConnections(companyData.connections || [])

      // Set first connection as selected by default
      if (companyData.connections && companyData.connections.length > 0) {
        setSelectedConnectionId(companyData.connections[0].id)
      }

      // Load all reports - we'll filter by connection's data source when running
      const allReports = await reportsApi.getAll()
      setReports(allReports)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных компании')
      navigate('/companies')
    } finally {
      setLoading(false)
    }
  }

  const handleRunReport = async (report: Report) => {
    if (!company || !selectedConnectionId) {
      message.warning('Пожалуйста, выберите подключение для выполнения отчета')
      return
    }

    // Find the selected connection to check data source
    const selectedConnection = connections.find((c) => c.id === selectedConnectionId)
    if (!selectedConnection) {
      message.error('Выбранное подключение не найдено')
      return
    }

    // Filter reports by connection's data source
    if (selectedConnection.data_source_id !== report.data_source_id) {
      message.warning('Этот отчет не доступен для выбранного подключения')
      return
    }

    setRunningReportId(report.id)
    try {
      const blob = await reportsApi.run({
        connection_id: selectedConnectionId,
        report_type: report.report_type,
        encoding,
      })
      
      // TODO: backend already return file response, we don't click to link etc.
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename
      const date = new Date().toISOString().split('T')[0]
      const filename = `${report.name}_${company.name}_${date}.csv`
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

  // Filter reports by selected connection's data source
  const getAvailableReports = () => {
    if (!selectedConnectionId) return []
    const selectedConnection = connections.find((c) => c.id === selectedConnectionId)
    if (!selectedConnection) return []
    return reports.filter((report) => report.data_source_id === selectedConnection.data_source_id)
  }

  const columns = [
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
          disabled={!selectedConnectionId}
        >
          Запустить
        </Button>
      ),
    },
  ]

  if (loading && !company) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!company) {
    return null
  }

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%', gap: '24px' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/companies')}
              >
                Назад к компаниям
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                <ShopOutlined /> {company.name}
              </Title>
            </Space>
            <Select
              value={encoding}
              onChange={(value) => setEncoding(value)}
              style={{ width: 150 }}
            >
              <Option value="cp1251">CP1251</Option>
              <Option value="utf-8">UTF-8</Option>
              <Option value="utf-8-sig">UTF-8-SIG (Windows)</Option>
            </Select>
          </div>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="Название компании">{company.name}</Descriptions.Item>
            <Descriptions.Item label="Slug">
              {company.slug ? <Tag color="purple">{company.slug}</Tag> : <span style={{ color: '#999' }}>Не задан</span>}
            </Descriptions.Item>
            <Descriptions.Item label="Подключения">
              {connections.length > 0 ? (
                <Tag color="blue">{connections.length} подключений</Tag>
              ) : (
                <span style={{ color: '#999' }}>Нет подключений</span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Создано">
              {new Date(company.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Обновлено">
              {new Date(company.updated_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Title level={4} style={{ marginBottom: 16 }}>
              <LinkOutlined /> Подключения
            </Title>
            {connections.length === 0 ? (
              <Alert
                message="Нет подключений"
                description="Создайте подключение для этой компании на странице Подключения."
                type="info"
                showIcon
                action={
                  <Button size="small" onClick={() => navigate('/connections')}>
                    Перейти к подключениям
                  </Button>
                }
              />
            ) : (
              <Table
                columns={[
                  {
                    title: 'ID',
                    dataIndex: 'id',
                    key: 'id',
                    width: 80,
                  },
                  {
                    title: 'Источник данных',
                    key: 'data_source',
                    render: (_: any, record: Connection) => (
                      <Tag color="blue">
                        {record.data_source?.title || `ID: ${record.data_source_id}`}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Создано',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date: string) => new Date(date).toLocaleDateString(),
                  },
                ]}
                dataSource={connections}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>Доступные отчеты</Title>
              {connections.length > 0 && (
                <Select
                  value={selectedConnectionId}
                  onChange={(value) => setSelectedConnectionId(value)}
                  style={{ width: 300 }}
                  placeholder="Выберите подключение"
                >
                  {connections.map((conn) => (
                    <Option key={conn.id} value={conn.id}>
                      {conn.data_source?.title || `ID: ${conn.data_source_id}`}
                    </Option>
                  ))}
                </Select>
              )}
            </div>
            {!selectedConnectionId && connections.length > 0 ? (
              <Alert
                message="Выберите подключение"
                description="Пожалуйста, выберите подключение для просмотра доступных отчетов."
                type="info"
                showIcon
              />
            ) : getAvailableReports().length === 0 ? (
              <Card>
                <Typography.Text type="secondary">
                  Нет доступных отчетов для выбранного подключения. Пожалуйста, создайте отчеты на странице Отчеты.
                </Typography.Text>
              </Card>
            ) : (
              <Table
                columns={columns}
                dataSource={getAvailableReports()}
                rowKey="id"
                pagination={false}
              />
            )}
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default CompanyDetail

