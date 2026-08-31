import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  message,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  Breadcrumb,
  Select,
  DatePicker,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  fulfillmentsApi,
  productCategoriesApi,
  fbsShipmentsApi,
  type Fulfillment,
  type ProductCategory,
  type FBSShipment,
} from '../api/wbFulfillment'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const FBSShipments: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const connId = connectionId ? parseInt(connectionId) : 0

  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [shipments, setShipments] = useState<FBSShipment[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingShipment, setEditingShipment] = useState<FBSShipment | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    if (connId) loadData()
  }, [connId])

  const loadData = async () => {
    setLoading(true)
    try {
      const connectionData = await connectionsApi.getById(connId)
      if (connectionData.company_id) {
        try {
          setCompany(await companiesApi.getById(connectionData.company_id))
        } catch {
          setCompany(null)
        }
      }
      const [fulfillmentsData, categoriesData, shipmentsData] = await Promise.all([
        fulfillmentsApi.getAll(connId),
        productCategoriesApi.getAll(connId),
        fbsShipmentsApi.getAll(connId),
      ])
      setFulfillments(fulfillmentsData)
      setCategories(categoriesData)
      setShipments(shipmentsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingShipment(null)
    form.resetFields()
    setModalVisible(true)
  }

  const openEditModal = (shipment: FBSShipment) => {
    setEditingShipment(shipment)
    form.setFieldsValue({
      fulfillment_id: shipment.fulfillment_id,
      product_category_id: shipment.product_category_id,
      date: dayjs(shipment.date),
      quantity: shipment.quantity,
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const date = (values.date as dayjs.Dayjs).format('YYYY-MM-DD')
      if (editingShipment) {
        await fbsShipmentsApi.update(connId, editingShipment.id, {
          date,
          quantity: values.quantity,
        })
        message.success('Отгрузка обновлена')
      } else {
        await fbsShipmentsApi.create(connId, {
          fulfillment_id: values.fulfillment_id,
          product_category_id: values.product_category_id,
          date,
          quantity: values.quantity,
        })
        message.success('Отгрузка создана')
      }
      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fbsShipmentsApi.delete(connId, id)
      message.success('Отгрузка удалена')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const fulfillmentName = (id: number) =>
    fulfillments.find((f) => f.id === id)?.name || `#${id}`
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name || `#${id}`

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (v: string) => new Date(v).toLocaleDateString('ru-RU'),
      sorter: (a: FBSShipment, b: FBSShipment) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Фулфилмент',
      dataIndex: 'fulfillment_id',
      key: 'fulfillment_id',
      render: (id: number) => fulfillmentName(id),
    },
    {
      title: 'Категория товара',
      dataIndex: 'product_category_id',
      key: 'product_category_id',
      render: (id: number) => categoryName(id),
    },
    { title: 'Количество', dataIndex: 'quantity', key: 'quantity', width: 130 },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: FBSShipment) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm
            title="Удалить отгрузку?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%', gap: '24px' }} size="large">
          <div className="crm-split-header">
            <div className="crm-split-header__start">
              <Breadcrumb
                items={[
                  { title: <Link to="/connections">API Подключения</Link> },
                  { title: <Link to={`/connections/${connId}`}>{company?.name || 'Подключение'}</Link> },
                  { title: 'Отгрузки товаров' },
                ]}
              />
            </div>
            <div className="crm-split-header__end">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                Добавить отгрузку
              </Button>
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Отгрузки товаров{company && ': ' + company.name}
          </Title>
          <Table
            columns={columns}
            dataSource={shipments}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего ${total} строк` }}
          />
        </Space>
      </Card>

      <Modal
        title={editingShipment ? 'Редактировать отгрузку' : 'Добавить отгрузку'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingShipment ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fulfillment_id"
            label="Фулфилмент"
            rules={[{ required: true, message: 'Выберите фулфилмент' }]}
          >
            <Select
              disabled={!!editingShipment}
              options={fulfillments.map((f) => ({ value: f.id, label: f.name }))}
            />
          </Form.Item>
          <Form.Item
            name="product_category_id"
            label="Категория товара"
            rules={[{ required: true, message: 'Выберите категорию' }]}
          >
            <Select
              disabled={!!editingShipment}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="date" label="Дата" rules={[{ required: true, message: 'Выберите дату' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Количество"
            rules={[{ required: true, message: 'Введите количество' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FBSShipments
