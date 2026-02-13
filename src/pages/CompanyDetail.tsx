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
  Spin,
  Alert,
  Descriptions,
} from 'antd'
import {
  ArrowLeftOutlined,
  ShopOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { companiesApi } from '../api/companies'
import type { Company } from '../api/companies'
import type { Connection } from '../api/connections'

const { Title } = Typography

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)

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
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных компании')
      navigate('/companies')
    } finally {
      setLoading(false)
    }
  }

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
          </div>

          <Descriptions bordered column={1}>
            <Descriptions.Item label="Компания">
              {company.name}
            </Descriptions.Item>
            <Descriptions.Item label="Создано">
              {new Date(company.created_at).toLocaleString('ru-RU')}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Title level={4} style={{ marginBottom: 16 }}>
              <LinkOutlined /> API Подключения
            </Title>
            {connections.length === 0 ? (
              <Alert
                title="Нет подключений"
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
                  {
                    title: 'Действия',
                    key: 'actions',
                    width: 150,
                    align: 'center',
                    render: (_: any, record: Connection) => (
                      <Button
                        type="primary"
                        onClick={() => navigate(`/connections/${record.id}`)}
                      >
                        Детали
                      </Button>
                    ),
                  },
                ]}
                dataSource={connections}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default CompanyDetail

