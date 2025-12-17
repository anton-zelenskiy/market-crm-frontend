import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Upload,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { vendorProductsApi, type VendorProduct, type VendorProductCreate, type VendorProductUpdate } from '../api/products'
import { companiesApi } from '../api/companies'

const { Title } = Typography

const VendorProducts: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null)
  const [form] = Form.useForm()
  const [companyName, setCompanyName] = useState<string>('')

  useEffect(() => {
    if (companyId) {
      loadData()
    }
  }, [companyId])

  const loadData = async () => {
    if (!companyId) return

    setLoading(true)
    try {
      const company = await companiesApi.getById(parseInt(companyId))
      setCompanyName(company.name)
      
      const productsData = await vendorProductsApi.getAll(parseInt(companyId))
      setProducts(productsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProduct(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: VendorProduct) => {
    setEditingProduct(record)
    form.setFieldsValue({
      offer_id: record.offer_id,
      name: record.name,
      quantity: record.quantity,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    if (!companyId) return
    
    try {
      await vendorProductsApi.delete(parseInt(companyId), id)
      message.success('Товар успешно удален')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления товара')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!companyId) return

      if (editingProduct) {
        await vendorProductsApi.update(parseInt(companyId), editingProduct.id, values as VendorProductUpdate)
        message.success('Товар успешно обновлен')
      } else {
        await vendorProductsApi.create(parseInt(companyId), values as VendorProductCreate)
        message.success('Товар успешно создан')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.response?.data?.detail || 'Ошибка сохранения товара')
    }
  }

  const handleCSVUpload = async (file: File) => {
    if (!companyId) return

    try {
      const result = await vendorProductsApi.syncFromCSV(parseInt(companyId), file)
      message.success(result.message || `Синхронизировано ${result.products_synced} товаров`)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки CSV файла')
    }
    return false // Prevent default upload
  }

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'offer_id',
      key: 'offer_id',
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Количество на складе',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => quantity.toLocaleString(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: VendorProduct) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить этот товар?"
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
        <Space orientation="vertical" style={{ width: '100%', gap: '24px' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/companies/${companyId}`)}
              >
                Назад к компании
              </Button>
            </Space>
            <Space>
              <Upload
                accept=".csv"
                beforeUpload={handleCSVUpload}
                showUploadList={false}
              >
                <Tooltip title="Загрузите csv с колонками: 'Артикул', 'Наименование', 'Количество на складе'">
                  <Button icon={<UploadOutlined />}>
                    Загрузить из CSV
                  </Button>
                </Tooltip>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Добавить товар
              </Button>
            </Space>
          </div>

          <Title level={2} style={{ margin: 0 }}>
            Товары поставщика: {companyName}
          </Title>

          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Всего ${total} товаров` }}
          />
        </Space>
      </Card>

      <Modal
        title={editingProduct ? 'Редактировать товар' : 'Создать товар'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingProduct ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="offer_id"
            label="Артикул"
            rules={[{ required: true, message: 'Пожалуйста, введите артикул' }]}
          >
            <Input placeholder="Введите артикул" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Пожалуйста, введите наименование' }]}
          >
            <Input placeholder="Введите наименование" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Количество на складе"
            rules={[{ required: true, message: 'Пожалуйста, введите количество' }]}
          >
            <InputNumber
              placeholder="Введите количество"
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default VendorProducts

