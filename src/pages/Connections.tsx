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
  LinkOutlined,
} from '@ant-design/icons'
import { connectionsApi } from '../api/connections'
import type { Connection, ConnectionCreate } from '../api/connections'
import { companiesApi } from '../api/companies'
import type { Company } from '../api/companies'
import { dataSourcesApi } from '../api/dataSources'
import type { DataSource } from '../api/dataSources'

const { Title } = Typography
const { Option } = Select
const { Password } = Input

const Connections: React.FC = () => {
  const navigate = useNavigate()
  const [connections, setConnections] = useState<Connection[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [connectionsData, companiesData, dataSourcesData] = await Promise.all([
        connectionsApi.getAll(),
        companiesApi.getAll(),
        dataSourcesApi.getAll(),
      ])
      setConnections(Array.isArray(connectionsData) ? connectionsData : [])
      setCompanies(Array.isArray(companiesData) ? companiesData : [])
      setDataSources(Array.isArray(dataSourcesData) ? dataSourcesData : [])
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingConnection(null)
    setSelectedDataSource(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Connection) => {
    setEditingConnection(record)
    const ds = dataSources.find((d) => d.id === record.data_source_id)
    setSelectedDataSource(ds || null)
    form.setFieldsValue({
      company_id: record.company_id,
      data_source_id: record.data_source_id,
      ...record.credentials,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await connectionsApi.delete(id)
      message.success('Подключение успешно удалено')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления подключения')
    }
  }

  const handleDataSourceChange = (dataSourceId: number) => {
    const ds = dataSources.find((d) => d.id === dataSourceId)
    setSelectedDataSource(ds || null)
    
    // When changing data source, preserve existing credential values if they match
    // Otherwise clear them
    if (ds) {
      const credentialValues: Record<string, any> = {}
      const previousDataSource = editingConnection
        ? dataSources.find((d) => d.id === editingConnection.data_source_id)
        : null
      
      // If we have previous credentials and the field exists in the new data source, preserve it
      if (previousDataSource && editingConnection) {
        ds.credential_fields.forEach((field) => {
          if (editingConnection.credentials[field.name] !== undefined) {
            credentialValues[field.name] = editingConnection.credentials[field.name]
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
      const { company_id, data_source_id, ...credentials } = values

      const data: ConnectionCreate = {
        company_id,
        data_source_id,
        credentials,
      }

      if (editingConnection) {
        await connectionsApi.update(editingConnection.id, {
          data_source_id,
          credentials,
        })
        message.success('Подключение успешно обновлено')
      } else {
        await connectionsApi.create(data)
        message.success('Подключение успешно создано')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Ошибка сохранения подключения')
    }
  }

  const renderCredentialFields = () => {
    if (!selectedDataSource) {
      return (
        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
          Пожалуйста, выберите источник данных для настройки учетных данных
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
              message: `Пожалуйста, введите ${field.label}`,
            },
          ]}
          tooltip={field.description || undefined}
        >
          <InputComponent placeholder={`Введите ${field.label}`} />
        </Form.Item>
      )
    })
  }

  const columns = [
    {
      title: 'ID',
      key: 'id',
      dataIndex: 'id',
      width: 100,
      align: 'center',
    },
    {
      title: 'Компания',
      key: 'company',
      render: (_: any, record: Connection) => {
        const company = companies.find((c) => c.id === record.company_id)
        return company ? company.name : `ID: ${record.company_id}`
      },
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
    {
      title: 'Действия',
      key: 'actions',
      width: 250,
      align: 'center',
      render: (_: any, record: Connection) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить это подключение?"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            <LinkOutlined /> Подключения
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать подключение
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={connections}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
        />
      </Card>

      <Modal
        title={editingConnection ? 'Редактировать подключение' : 'Создать подключение'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editingConnection ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="company_id"
            label="Компания"
            rules={[{ required: true, message: 'Пожалуйста, выберите компанию' }]}
          >
            <Select
              placeholder="Выберите компанию"
              disabled={!!editingConnection}
            >
              {companies.map((company) => (
                <Option key={company.id} value={company.id}>
                  {company.name}
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
              <Title level={5}>Учетные данные</Title>
              {renderCredentialFields()}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default Connections

