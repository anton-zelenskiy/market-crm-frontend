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
} from 'antd'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { companiesApi } from '../api/companies'
import type { Company } from '../api/companies'
import { reportsApi } from '../api/reports'
import type { Report, ReportType } from '../api/reports'

const { Title } = Typography
const { Option } = Select

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [runningReportId, setRunningReportId] = useState<number | null>(null)
  const [encoding, setEncoding] = useState<'cp1251' | 'utf-8' | 'utf-16'>('cp1251')

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

      // Load all reports and filter by data source
      const allReports = await reportsApi.getAll()
      const filteredReports = allReports.filter(
        (report) => report.data_source_id === companyData.data_source_id
      )
      setReports(filteredReports)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных компании')
      navigate('/companies')
    } finally {
      setLoading(false)
    }
  }

  const handleRunReport = async (report: Report) => {
    if (!company || !id) return

    setRunningReportId(report.id)
    try {
      const blob = await reportsApi.run({
        company_id: parseInt(id),
        report_type: report.report_type as ReportType,
        encoding,
      })

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
        <Space direction="vertical" style={{ width: '100%', gap: '24px' }} size="large">
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
              <Option value="utf-16">UTF-16</Option>
            </Select>
          </div>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="Название компании">{company.name}</Descriptions.Item>
            <Descriptions.Item label="Slug">
              {company.slug ? <Tag color="purple">{company.slug}</Tag> : <span style={{ color: '#999' }}>Не задан</span>}
            </Descriptions.Item>
            <Descriptions.Item label="Источник данных">
              <Tag color="green">{company.data_source?.title || `ID: ${company.data_source_id}`}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Создано">
              {new Date(company.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Обновлено">
              {new Date(company.updated_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Title level={4} style={{ marginBottom: 16 }}>Доступные отчеты</Title>
            {reports.length === 0 ? (
              <Card>
                <Typography.Text type="secondary">
                  Нет доступных отчетов для этого источника данных. Пожалуйста, создайте отчеты на странице Отчеты.
                </Typography.Text>
              </Card>
            ) : (
              <Table
                columns={columns}
                dataSource={reports}
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

