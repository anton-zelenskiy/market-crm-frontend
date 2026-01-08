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
  Modal,
  Upload,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { suppliesApi, type SupplySnapshotResponse } from '../api/supplies'
import { connectionsApi, type Connection } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const SupplyTemplates: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState<SupplySnapshotResponse[]>([])
  const [connection, setConnection] = useState<Connection | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])

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
      
      const companyData = await companiesApi.getById(connectionData.company_id)
      setCompany(companyData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!connectionId) return
    if (fileList.length === 0) {
      message.error('Пожалуйста, выберите файл с ограничениями складов')
      return
    }

    setCreating(true)
    try {
      const file = fileList[0].originFileObj
      const newSnapshot = await suppliesApi.createSnapshot(parseInt(connectionId), file)
      message.success('Новый шаблон поставки создан')
      setModalVisible(false)
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
      title: '№',
      dataIndex: 'id',
      key: 'id',
      width: 240,
      render: (_: string, record: SupplySnapshotResponse) => (
        <Button
          type="link"
          onClick={() => navigate(`/connections/${connectionId}/supply-templates/${record.id}`)}
        >
          <Space>Поставка №{record.id} от {new Date(record.updated_at).toLocaleDateString('ru-RU')}</Space>
        </Button>        
      ),
    },
    {
      title: 'Кол-во товаров',
      dataIndex: 'data',
      key: 'items_count',
      width: 120,
      render: (data: any[]) => data.length,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: SupplySnapshotResponse) => (
        <Popconfirm
          title="Вы уверены, что хотите удалить этот шаблон?"
          onConfirm={() => handleDelete(record.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
          </Button>
        </Popconfirm>
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
                onClick={() => navigate(`/connections/${connectionId}`)}
              >
                Назад
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                <FileTextOutlined /> Поставки - {company?.name} ({connection?.data_source?.title})
              </Title>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
              loading={creating}
            >
              Сформировать поставку
            </Button>
          </div>

          <Modal
            title="Сформировать новую поставку"
            open={modalVisible}
            onOk={handleCreate}
            onCancel={() => {
              setModalVisible(false)
              setFileList([])
            }}
            confirmLoading={creating}
            okText="Создать"
            cancelText="Отмена"
          >
            <div style={{ marginBottom: '16px' }}>
              <Typography.Paragraph>
                Для формирования новой поставки необходимо загрузить файл XLS с ограничениями складов в кластерах.
                Перейдите в раздел <a href="https://seller.ozon.ru/app/analytics/goods-availability/index" target="_blank">Планирование поставок</a> в личном кабинете Ozon, выберите все кластера, скачайте XLS файл и прикрепите файл".
              </Typography.Paragraph>
              <Upload
                accept=".xlsx"
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList }) => setFileList(fileList.slice(-1))}
              >
                <Button icon={<UploadOutlined />}>Загрузить ограничения складов</Button>
              </Upload>
            </div>
          </Modal>

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
