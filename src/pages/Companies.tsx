import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ShopOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { companiesApi } from '../api/companies'
import type { Company, CompanyCreate } from '../api/companies'
import { dataSourcesApi } from '../api/dataSources'
import type { DataSource } from '../api/dataSources'

const { Title } = Typography
const { Option } = Select
const { Password } = Input

const Companies: React.FC = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [companiesData, dataSourcesData] = await Promise.all([
        companiesApi.getAll(),
        dataSourcesApi.getAll(),
      ])
      setCompanies(Array.isArray(companiesData) ? companiesData : [])
      setDataSources(Array.isArray(dataSourcesData) ? dataSourcesData : [])
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCompany(null)
    setSelectedDataSource(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Company) => {
    setEditingCompany(record)
    const ds = dataSources.find((d) => d.id === record.data_source_id)
    setSelectedDataSource(ds || null)
    form.setFieldsValue({
      name: record.name,
      data_source_id: record.data_source_id,
      ...record.credentials,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await companiesApi.delete(id)
      message.success('Company deleted successfully')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete company')
    }
  }

  const handleDataSourceChange = (dataSourceId: number) => {
    const ds = dataSources.find((d) => d.id === dataSourceId)
    setSelectedDataSource(ds || null)
    
    // When changing data source, preserve existing credential values if they match
    // Otherwise clear them
    if (ds) {
      const credentialValues: Record<string, any> = {}
      const previousDataSource = editingCompany
        ? dataSources.find((d) => d.id === editingCompany.data_source_id)
        : null
      
      // If we have previous credentials and the field exists in the new data source, preserve it
      if (previousDataSource && editingCompany) {
        ds.credential_fields.forEach((field) => {
          if (editingCompany.credentials[field.name] !== undefined) {
            credentialValues[field.name] = editingCompany.credentials[field.name]
          }
        })
      }
      
      // Clear fields that don't exist in the new data source
      const allFieldNames = dataSources.flatMap((ds) =>
        ds.credential_fields.map((f) => f.name)
      )
      const newFieldNames = new Set(ds.credential_fields.map((f) => f.name))
      allFieldNames.forEach((name) => {
        if (!newFieldNames.has(name)) {
          form.setFieldValue(name, undefined)
        }
      })
      
      form.setFieldsValue(credentialValues)
    } else {
      // Clear all credential fields
      const allFieldNames = dataSources.flatMap((ds) =>
        ds.credential_fields.map((f) => f.name)
      )
      allFieldNames.forEach((name) => {
        form.setFieldValue(name, undefined)
      })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const { name, data_source_id, ...credentials } = values

      const data: CompanyCreate = {
        name,
        data_source_id,
        credentials,
      }

      if (editingCompany) {
        await companiesApi.update(editingCompany.id, data)
        message.success('Company updated successfully')
      } else {
        await companiesApi.create(data)
        message.success('Company created successfully')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Failed to save company')
    }
  }

  const renderCredentialFields = () => {
    if (!selectedDataSource) {
      return (
        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
          Please select a data source to configure credentials
        </div>
      )
    }

    return selectedDataSource.credential_fields.map((field) => {
      const isPassword = field.type === 'password'
      const InputComponent = isPassword ? Password : Input

      return (
        <Form.Item
          key={field.name}
          name={field.name}
          label={field.label}
          rules={[
            {
              required: field.required ?? true,
              message: `Please enter ${field.label}`,
            },
          ]}
          tooltip={field.description || undefined}
        >
          <InputComponent placeholder={`Enter ${field.label}`} />
        </Form.Item>
      )
    })
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Data Source',
      key: 'data_source',
      render: (_: any, record: Company) => (
        <Tag color="blue">
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
      width: 200,
      render: (_: any, record: Company) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/companies/${record.id}`)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this company?"
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
            <ShopOutlined /> Companies
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Company
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={companies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        />
      </Card>

      <Modal
        title={editingCompany ? 'Edit Company' : 'Create Company'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editingCompany ? 'Update' : 'Create'}
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="Enter company name" />
          </Form.Item>

          <Form.Item
            name="data_source_id"
            label="Data Source"
            rules={[{ required: true, message: 'Please select a data source' }]}
          >
            <Select
              placeholder="Select data source"
              onChange={handleDataSourceChange}
            >
              {dataSources.map((ds) => (
                <Option key={ds.id} value={ds.id}>
                  {ds.title} ({ds.name})
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedDataSource && (
            <div style={{ marginTop: 16 }}>
              <Title level={5}>Credentials</Title>
              {renderCredentialFields()}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default Companies

