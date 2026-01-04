import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Card,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { suppliesApi, type SupplySnapshotResponse } from '../api/supplies'
import { connectionsApi, type Connection } from '../api/connections'

const { Title } = Typography

const SupplyTemplates: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState<SupplySnapshotResponse[]>([])
  const [connection, setConnection] = useState<Connection | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (connectionId) {
      loadData()
    }
  }, [connectionId])

  const loadData = async () => {
    if (!connectionId) return
    setLoading(true)
    try {
      const [snapshotsData, connectionData] = await Promise.all([
        suppliesApi.getSnapshots(parseInt(connectionId)),
        connectionsApi.getById(parseInt(connectionId)),
      ])
      setSnapshots(snapshotsData)
      setConnection(connectionData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!connectionId) return
    setCreating(true)
    try {
      const newSnapshot = await suppliesApi.createSnapshot(parseInt(connectionId))
      message.success('Новый шаблон поставки создан')
      navigate(`/connections/${connectionId}/supply-templates/${newSnapshot.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка создания шаблона')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (snapshotId: number) => {
    try {
      await suppliesApi.deleteSnapshot(snapshotId)
      message.success('Шаблон удален')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления шаблона')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Дата обновления',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleString('ru-RU'),
    },
    {
      title: 'Кол-во товаров',
      dataIndex: 'data',
      key: 'items_count',
      render: (data: any[]) => data.length,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: SupplySnapshotResponse) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/connections/${connectionId}/supply-templates/${record.id}`)}
          >
            Просмотр
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить этот шаблон?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/connections/${connectionId}/supplies`)}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                <FileTextOutlined /> Шаблоны поставок - {connection?.company_name || connection?.data_source?.title || ''}
              </Title>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              loading={creating}
            >
              Сформировать поставку
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={snapshots}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего ${total} шаблонов`,
            }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default SupplyTemplates
