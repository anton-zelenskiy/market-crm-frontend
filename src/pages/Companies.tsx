import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
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
      message.success('Компания успешно удалена')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления компании')
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
        message.success('Компания успешно обновлена')
      } else {
        await companiesApi.create(data)
        message.success('Компания успешно создана')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Ошибка сохранения компании')
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
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: Company) => <Link to={`/companies/${record.id}`}>{record.name}</Link>,
    },
    {
      title: 'Источник данных',
      key: 'data_source',
      render: (_: any, record: Company) => (
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
      width: 200,
      render: (_: any, record: Company) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/companies/${record.id}`)}
          >
            Просмотр
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить эту компанию?"
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
            <ShopOutlined /> Компании
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать компанию
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={companies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
        />
      </Card>

      <Modal
        title={editingCompany ? 'Редактировать компанию' : 'Создать компанию'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editingCompany ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название компании"
            rules={[{ required: true, message: 'Пожалуйста, введите название компании' }]}
          >
            <Input placeholder="Введите название компании" />
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

export default Companies

