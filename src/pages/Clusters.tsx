import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Card,
  Typography,
} from 'antd'
import {
  EditOutlined,
  ClusterOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { ozonClustersApi, type OzonCluster } from '../api/clusters'

const { Title } = Typography
const { Option } = Select

const Clusters: React.FC = () => {
  const [clusters, setClusters] = useState<OzonCluster[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCluster, setEditingCluster] = useState<OzonCluster | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadClusters()
  }, [])

  const loadClusters = async () => {
    setLoading(true)
    try {
      const data = await ozonClustersApi.getAll()
      setClusters(data)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки кластеров Ozon')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await ozonClustersApi.syncFromAPI()
      message.success(result.message || 'Синхронизация кластеров Ozon завершена')
      loadClusters()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка синхронизации кластеров')
    } finally {
      setSyncing(false)
    }
  }

  const handleEdit = (record: OzonCluster) => {
    setEditingCluster(record)
    form.setFieldsValue({
      neighbor_cluster_id: record.neighbor_cluster_id,
      priority: record.priority,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingCluster) {
        await ozonClustersApi.update(editingCluster.id, {
          neighbor_cluster_id: values.neighbor_cluster_id ?? null,
          priority: values.priority,
        })
        message.success('Кластер Ozon успешно обновлен')
        setModalVisible(false)
        loadClusters()
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.response?.data?.detail || 'Ошибка сохранения кластера')
    }
  }

  const columns = [
    {
      title: 'ID кластера (Ozon)',
      dataIndex: 'cluster_id',
      key: 'cluster_id',
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      sorter: (a: OzonCluster, b: OzonCluster) => a.priority - b.priority,
    },
    {
      title: 'Соседний кластер',
      dataIndex: 'neighbor_cluster_id',
      key: 'neighbor_cluster_id',
      render: (neighborId: number | null) => {
        if (!neighborId) return '-'
        const neighbor = clusters.find(c => c.id === neighborId)
        return neighbor ? neighbor.name : neighborId
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: OzonCluster) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Редактировать
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            <ClusterOutlined /> Кластеры Ozon
          </Title>
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            onClick={handleSync}
            loading={syncing}
          >
            Синхронизировать
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={clusters}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
        />
      </Card>

      <Modal
        title={`Редактировать кластер Ozon: ${editingCluster?.name}`}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="Обновить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="priority"
            label="Приоритет"
            rules={[{ required: true, message: 'Пожалуйста, введите приоритет' }]}
            initialValue={1}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="neighbor_cluster_id"
            label="Соседний кластер"
          >
            <Select placeholder="Выберите соседний кластер" allowClear>
              {clusters
                .filter(c => c.id !== editingCluster?.id)
                .map(c => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Clusters
