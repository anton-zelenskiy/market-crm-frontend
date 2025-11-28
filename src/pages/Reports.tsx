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
      message.error(error.response?.data?.detail || 'Failed to load reports')
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
      message.error(error.response?.data?.detail || 'Failed to load data sources')
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
      message.success('Report deleted successfully')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete report')
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
        message.success('Report updated successfully')
      } else {
        await reportsApi.create(data)
        message.success('Report created successfully')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Failed to save report')
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
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Report Type',
      dataIndex: 'report_type',
      key: 'report_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Data Source',
      key: 'data_source',
      render: (_: any, record: Report) => (
        <Tag color="green">
          {record.data_source?.title || `ID: ${record.data_source_id}`}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: Report) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this report?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
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
            <FileTextOutlined /> Reports
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Report
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        />
      </Card>

      <Modal
        title={editingReport ? 'Edit Report' : 'Create Report'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editingReport ? 'Update' : 'Create'}
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="e.g., Ozon Stocks Report" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name (System Slug)"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input placeholder="e.g., ozon_stocks" />
          </Form.Item>

          <Form.Item
            name="report_type"
            label="Report Type"
            rules={[{ required: true, message: 'Please select report type' }]}
          >
            <Select placeholder="Select report type">
              {reportTypes.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="data_source_id"
            label="Data Source"
            rules={[{ required: true, message: 'Please select a data source' }]}
          >
            <Select 
              placeholder="Select data source"
              loading={dataSourcesLoading}
              showSearch
              filterOption={(input, option) => {
                const label = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '')
                return label.toLowerCase().includes(input.toLowerCase())
              }}
              notFoundContent={dataSourcesLoading ? <span>Loading...</span> : <span>No data sources found</span>}
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

