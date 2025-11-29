import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Card,
  Typography,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { reportsApi } from '../api/reports'
import type { Report, ReportCreate, ReportType } from '../api/reports'
import { dataSourcesApi } from '../api/dataSources'
import type { DataSource } from '../api/dataSources'

const { Title } = Typography
const { Option } = Select

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false)
  const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
    loadDataSources()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const reportsData = await reportsApi.getAll()
      setReports(Array.isArray(reportsData) ? reportsData : [])
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки отчетов')
    } finally {
      setLoading(false)
    }
  }

  const loadDataSources = async () => {
    if (dataSourcesLoaded) return // Already loaded
    
    setDataSourcesLoading(true)
    try {
      const dataSourcesData = await dataSourcesApi.getAll()
      setDataSources(Array.isArray(dataSourcesData) ? dataSourcesData : [])
      setDataSourcesLoaded(true)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки источников данных')
    } finally {
      setDataSourcesLoading(false)
    }
  }

  const handleCreate = async () => {
    setEditingReport(null)
    form.resetFields()
    await loadDataSources() // Ensure data sources are loaded
    setModalVisible(true)
  }

  const handleEdit = async (record: Report) => {
    setEditingReport(record)
    await loadDataSources() // Ensure data sources are loaded
    form.setFieldsValue({
      title: record.title,
      name: record.name,
      report_type: record.report_type,
      data_source_id: record.data_source_id,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await reportsApi.delete(id)
      message.success('Отчет успешно удален')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления отчета')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: ReportCreate = {
        title: values.title,
        name: values.name,
        report_type: values.report_type,
        data_source_id: values.data_source_id,
      }

      if (editingReport) {
        await reportsApi.update(editingReport.id, data)
        message.success('Отчет успешно обновлен')
      } else {
        await reportsApi.create(data)
        message.success('Отчет успешно создан')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Ошибка сохранения отчета')
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
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Имя',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип отчета',
      dataIndex: 'report_type',
      key: 'report_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Источник данных',
      key: 'data_source',
      render: (_: any, record: Report) => (
        <Tag color="green">
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
      render: (_: any, record: Report) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить этот отчет?"
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

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: 'ozon_stocks', label: 'Ozon Stocks' },
    { value: 'ozon_shipments', label: 'Ozon Shipments' },
    { value: 'ozon_product_volumes', label: 'Ozon Product Volumes' },
  ]

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            <FileTextOutlined /> Отчеты
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать отчет
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
        />
      </Card>

      <Modal
        title={editingReport ? 'Редактировать отчет' : 'Создать отчет'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editingReport ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Пожалуйста, введите название' }]}
          >
            <Input placeholder="Например: Отчет по остаткам Ozon" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Имя (системный идентификатор)"
            rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
          >
            <Input placeholder="Например: ozon_stocks" />
          </Form.Item>

          <Form.Item
            name="report_type"
            label="Тип отчета"
            rules={[{ required: true, message: 'Пожалуйста, выберите тип отчета' }]}
          >
            <Select placeholder="Выберите тип отчета">
              {reportTypes.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="data_source_id"
            label="Источник данных"
            rules={[{ required: true, message: 'Пожалуйста, выберите источник данных' }]}
          >
            <Select 
              placeholder="Выберите источник данных"
              loading={dataSourcesLoading}
              showSearch
              filterOption={(input, option) => {
                const label = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '')
                return label.toLowerCase().includes(input.toLowerCase())
              }}
              notFoundContent={dataSourcesLoading ? <span>Загрузка...</span> : <span>Источники данных не найдены</span>}
            >
              {dataSources.map((ds) => (
                <Option key={ds.id} value={ds.id}>
                  {ds.title} ({ds.name})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Reports

