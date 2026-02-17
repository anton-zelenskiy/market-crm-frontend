import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
  Card,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { companiesApi } from '../api/companies'
import type { Company, CompanyCreate } from '../api/companies'

const { Title } = Typography

const Companies: React.FC = () => {
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
      ozon_consignee_note_info: record.ozon_consignee_note_info,
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
      const { name, slug, ozon_consignee_note_info } = values

      const data: CompanyCreate = {
        name,
        slug: slug || null,
        ozon_consignee_note_info: ozon_consignee_note_info || null,
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
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: Company) => <Link to={`/companies/${record.id}`}>{record.name}</Link>,
    },
    {
      title: 'API Подключения',
      key: 'connections',
      render: (_: any, record: Company) => (
        <div>
          {record.connections?.map((connection) => (
            <Tag color="blue" key={connection.data_source?.name}>{connection.data_source?.name}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      align: 'right' as const,
      render: (_: any, record: Company) => (
        <div>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить эту компанию?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
            </Button>
          </Popconfirm>
        </div>
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

          <Divider orientation="horizontal">Информация для накладных Ozon</Divider>
          
          <Typography.Paragraph type="secondary">
            Данные отправителя (Shipper)
          </Typography.Paragraph>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['ozon_consignee_note_info', 'shipper', 'name']}
                label="Название организации"
              >
                <Input placeholder="ООО «Пример»" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['ozon_consignee_note_info', 'shipper', 'inn']}
                label="ИНН"
              >
                <Input placeholder="1234567890" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name={['ozon_consignee_note_info', 'shipper', 'phone']}
            label="Телефон отправителя"
          >
            <Input placeholder="8 (000) 000-00-00" />
          </Form.Item>

          <Typography.Paragraph type="secondary">
            Данные получателя (Consignee)
          </Typography.Paragraph>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['ozon_consignee_note_info', 'consignee', 'name']}
                label="Название организации"
              >
                <Input placeholder="ООО «Интернет Решения»" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['ozon_consignee_note_info', 'consignee', 'inn']}
                label="ИНН"
              >
                <Input placeholder="7704217370" />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Paragraph type="secondary">
            Менеджер
          </Typography.Paragraph>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['ozon_consignee_note_info', 'manager', 'display']}
                label="Имя (для отображения)"
              >
                <Input placeholder="Иван Иванов" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['ozon_consignee_note_info', 'manager', 'phone']}
                label="Телефон"
              >
                <Input placeholder="+79990000000" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default Companies

