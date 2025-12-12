import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Card,
  Typography,
  Tag,
  Badge,
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

const { Title } = Typography

const Companies: React.FC = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const companiesData = await companiesApi.getAll()
      setCompanies(Array.isArray(companiesData) ? companiesData : [])
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCompany(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Company) => {
    setEditingCompany(record)
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const { name, slug } = values

      const data: CompanyCreate = {
        name,
        slug: slug || null,
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
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string | null) => slug ? <Tag color="purple">{slug}</Tag> : <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Подключения',
      key: 'connections',
      render: (_: any, record: Company) => (
        <Badge count={record.connections?.length || 0} showZero>
          <Tag color="blue">
            {record.connections?.length || 0} подключений
          </Tag>
        </Badge>
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
            name="slug"
            label="Slug (уникальный идентификатор)"
            tooltip="Используется для идентификации компании в конфигурации отчетов. Оставьте пустым, если не требуется."
            rules={[
              {
                pattern: /^[a-z0-9_]+$/,
                message: 'Slug может содержать только строчные буквы, цифры и подчеркивания',
              },
            ]}
          >
            <Input placeholder="например: kazakova, mecherikov" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Companies

