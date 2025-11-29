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
      message.error(error.response?.data?.detail || 'Ошибка загрузки источников данных')
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
      message.success('Источник данных успешно удален')
      loadDataSources()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления источника данных')
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
        message.success('Источник данных успешно обновлен')
      } else {
        await dataSourcesApi.create(data)
        message.success('Источник данных успешно создан')
      }

      setModalVisible(false)
      loadDataSources()
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return
      }
      message.error(error.response?.data?.detail || 'Ошибка сохранения источника данных')
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
      title: 'Поля учетных данных',
      key: 'credential_fields',
      render: (_: any, record: DataSource) => record.credential_fields.length,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: DataSource) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить этот источник данных?"
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
            <DatabaseOutlined /> Источники данных
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать источник данных
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={dataSources}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Всего ${total} записей` }}
        />
      </Card>

      <Modal
        title={editingDataSource ? 'Редактировать источник данных' : 'Создать источник данных'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText={editingDataSource ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Пожалуйста, введите название' }]}
          >
            <Input placeholder="Например: Ozon" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Имя (системный идентификатор)"
            rules={[{ required: true, message: 'Пожалуйста, выберите имя' }]}
          >
            <Select placeholder="Выберите имя источника данных">
              <Option value="ozon">ozon</Option>
              <Option value="wildberries">wildberries</Option>
            </Select>
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Title level={5}>Поля учетных данных</Title>
              <Button type="dashed" onClick={addCredentialField}>
                Добавить поле
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
                    Удалить
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Input
                    placeholder="Имя поля (например, api_key)"
                    value={field.name}
                    onChange={(e) =>
                      updateCredentialField(index, { name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Метка поля (например, API ключ)"
                    value={field.label}
                    onChange={(e) =>
                      updateCredentialField(index, { label: e.target.value })
                    }
                  />
                  <Select
                    placeholder="Тип поля"
                    value={field.type}
                    onChange={(value) =>
                      updateCredentialField(index, { type: value })
                    }
                    style={{ width: '100%' }}
                  >
                    <Option value="string">Строка</Option>
                    <Option value="password">Пароль</Option>
                    <Option value="number">Число</Option>
                  </Select>
                  <div>
                    <Switch
                      checked={field.required ?? true}
                      onChange={(checked) =>
                        updateCredentialField(index, { required: checked })
                      }
                    />
                    <span style={{ marginLeft: 8 }}>Обязательное поле</span>
                  </div>
                  <TextArea
                    placeholder="Описание (необязательно)"
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

