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
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { dataSourcesApi } from '../api/dataSources'
import type { DataSource, DataSourceCreate, CredentialFieldDefinition } from '../api/dataSources'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

const DataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null)
  const [form] = Form.useForm()
  const [credentialFields, setCredentialFields] = useState<CredentialFieldDefinition[]>([])

  useEffect(() => {
    loadDataSources()
  }, [])

  const loadDataSources = async () => {
    setLoading(true)
    try {
      const data = await dataSourcesApi.getAll()
      setDataSources(data)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to load data sources')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingDataSource(null)
    setCredentialFields([])
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: DataSource) => {
    setEditingDataSource(record)
    setCredentialFields(record.credential_fields)
    form.setFieldsValue({
      title: record.title,
      name: record.name,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await dataSourcesApi.delete(id)
      message.success('Data source deleted successfully')
      loadDataSources()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete data source')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: DataSourceCreate = {
        title: values.title,
        name: values.name,
        credential_fields: credentialFields,
      }

      if (editingDataSource) {
        await dataSourcesApi.update(editingDataSource.id, data)
        message.success('Data source updated successfully')
      } else {
        await dataSourcesApi.create(data)
        message.success('Data source created successfully')
      }

      setModalVisible(false)
      loadDataSources()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Failed to save data source')
    }
  }

  const addCredentialField = () => {
    setCredentialFields([
      ...credentialFields,
      {
        name: '',
        label: '',
        type: 'string',
        required: true,
        description: null,
      },
    ])
  }

  const updateCredentialField = (index: number, field: Partial<CredentialFieldDefinition>) => {
    const updated = [...credentialFields]
    updated[index] = { ...updated[index], ...field }
    setCredentialFields(updated)
  }

  const removeCredentialField = (index: number) => {
    setCredentialFields(credentialFields.filter((_, i) => i !== index))
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
      title: 'Credential Fields',
      key: 'credential_fields',
      render: (_: any, record: DataSource) => record.credential_fields.length,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: DataSource) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this data source?"
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

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            <DatabaseOutlined /> Data Sources
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Data Source
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={dataSources}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        />
      </Card>

      <Modal
        title={editingDataSource ? 'Edit Data Source' : 'Create Data Source'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText={editingDataSource ? 'Update' : 'Create'}
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="e.g., Ozon" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name (System Slug)"
            rules={[{ required: true, message: 'Please select name' }]}
          >
            <Select placeholder="Select data source name">
              <Option value="ozon">ozon</Option>
              <Option value="wildberries">wildberries</Option>
            </Select>
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Title level={5}>Credential Fields</Title>
              <Button type="dashed" onClick={addCredentialField}>
                Add Field
              </Button>
            </div>

            {credentialFields.map((field, index) => (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 8 }}
                extra={
                  <Button
                    type="link"
                    danger
                    onClick={() => removeCredentialField(index)}
                  >
                    Remove
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Input
                    placeholder="Field name (e.g., api_key)"
                    value={field.name}
                    onChange={(e) =>
                      updateCredentialField(index, { name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Field label (e.g., API Key)"
                    value={field.label}
                    onChange={(e) =>
                      updateCredentialField(index, { label: e.target.value })
                    }
                  />
                  <Select
                    placeholder="Field type"
                    value={field.type}
                    onChange={(value) =>
                      updateCredentialField(index, { type: value })
                    }
                    style={{ width: '100%' }}
                  >
                    <Option value="string">String</Option>
                    <Option value="password">Password</Option>
                    <Option value="number">Number</Option>
                  </Select>
                  <div>
                    <Switch
                      checked={field.required ?? true}
                      onChange={(checked) =>
                        updateCredentialField(index, { required: checked })
                      }
                    />
                    <span style={{ marginLeft: 8 }}>Required</span>
                  </div>
                  <TextArea
                    placeholder="Description (optional)"
                    value={field.description || ''}
                    onChange={(e) =>
                      updateCredentialField(index, {
                        description: e.target.value || null,
                      })
                    }
                    rows={2}
                  />
                </Space>
              </Card>
            ))}
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default DataSources

