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
  Tag,
  Select,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  ozonProductsApi,
  type OzonProduct,
  type OzonProductCreate,
  type OzonProductUpdate,
} from '../api/products'
import { connectionsApi, type Connection } from '../api/connections'
import { vendorProductsApi, type VendorProduct } from '../api/products'

const { Title } = Typography
const { Option } = Select

const OzonProducts: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [products, setProducts] = useState<OzonProduct[]>([])
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<OzonProduct | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    if (connectionId) {
      loadData()
    }
  }, [connectionId])

  const loadData = async () => {
    if (!connectionId) return

    setLoading(true)
    try {
      const connectionData = await connectionsApi.getById(parseInt(connectionId))
      setConnection(connectionData)

      // Load vendor products for the company (for vendor_offer_id dropdown)
      if (connectionData.company_id) {
        try {
          const vendorProductsData = await vendorProductsApi.getAll(connectionData.company_id)
          setVendorProducts(vendorProductsData)
        } catch (error) {
          // Vendor products might not exist, that's okay
          console.log('No vendor products found for company')
        }
      }

      const productsData = await ozonProductsApi.getAll(parseInt(connectionId))
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

  const handleEdit = (record: OzonProduct) => {
    setEditingProduct(record)
    form.setFieldsValue({
      product_id: record.product_id,
      sku: record.sku,
      offer_id: record.offer_id,
      name: record.name,
      barcodes: record.barcodes.join(', '),
      box_quantity: record.box_quantity,
      vendor_offer_id: record.vendor_offer_id,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    if (!connectionId) return

    try {
      await ozonProductsApi.delete(parseInt(connectionId), id)
      message.success('Товар успешно удален')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления товара')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (!connectionId) return

      // Parse barcodes from comma-separated string
      const barcodes = values.barcodes
        ? values.barcodes.split(',').map((b: string) => b.trim()).filter((b: string) => b)
        : []

      const productData = {
        ...values,
        barcodes,
      }

      if (editingProduct) {
        await ozonProductsApi.update(
          parseInt(connectionId),
          editingProduct.id,
          productData as OzonProductUpdate
        )
        message.success('Товар успешно обновлен')
      } else {
        await ozonProductsApi.create(parseInt(connectionId), productData as OzonProductCreate)
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

  const handleSyncFromAPI = async () => {
    if (!connectionId) return

    setSyncing(true)
    try {
      const result = await ozonProductsApi.syncFromAPI(parseInt(connectionId))
      message.success(result.message || 'Товары успешно синхронизированы')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка синхронизации товаров')
    } finally {
      setSyncing(false)
    }
  }

  const handleCSVUpload = async (file: File) => {
    if (!connectionId) return

    try {
      const result = await ozonProductsApi.syncBoxQuantityFromCSV(parseInt(connectionId), file)
      message.success(result.message || `Обновлено ${result.products_updated} товаров`)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки CSV файла')
    }
    return false // Prevent default upload
  }

  const columns = [
    {
      title: 'Product ID',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 120,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 100,
    },
    {
      title: 'Артикул Ozon',
      dataIndex: 'offer_id',
      key: 'offer_id',
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Штрихкоды',
      dataIndex: 'barcodes',
      key: 'barcodes',
      render: (barcodes: string[]) => (
        <Space wrap>
          {barcodes.slice(0, 2).map((barcode, idx) => (
            <Tag key={idx}>{barcode}</Tag>
          ))}
          {barcodes.length > 2 && <Tag>+{barcodes.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Количество в коробке',
      dataIndex: 'box_quantity',
      key: 'box_quantity',
      render: (quantity: number | null) => quantity ?? <span style={{ color: '#999' }}>Не задано</span>,
    },
    {
      title: 'Артикул поставщика',
      dataIndex: 'vendor_offer_id',
      key: 'vendor_offer_id',
      render: (vendorOfferId: string | null) =>
        vendorOfferId ? <Tag color="blue">{vendorOfferId}</Tag> : <span style={{ color: '#999' }}>Не задан</span>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: OzonProduct) => (
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
                onClick={() => navigate('/connections')}
              >
                Назад к подключениям
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Товары Ozon
                {connection && (
                  <span style={{ fontSize: '16px', fontWeight: 'normal', marginLeft: '8px' }}>
                    (Подключение ID: {connection.id})
                  </span>
                )}
              </Title>
            </Space>
            <Space>
              <Button
                icon={<SyncOutlined />}
                loading={syncing}
                onClick={handleSyncFromAPI}
              >
                Синхронизировать с Ozon
              </Button>
              <Upload
                accept=".csv"
                beforeUpload={handleCSVUpload}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>
                  Загрузить box_quantity из CSV
                </Button>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Добавить товар
              </Button>
            </Space>
          </div>

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
        title={editingProduct ? 'Редактировать товар Ozon' : 'Создать товар Ozon'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingProduct ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="product_id"
            label="Product ID"
          >
            <InputNumber placeholder="Введите Product ID" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="sku"
            label="SKU"
            rules={[{ required: true, message: 'Пожалуйста, введите SKU' }]}
          >
            <InputNumber placeholder="Введите SKU" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="offer_id"
            label="Артикул Ozon"
            rules={[{ required: true, message: 'Пожалуйста, введите артикул Ozon' }]}
          >
            <Input placeholder="Введите артикул Ozon" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Пожалуйста, введите наименование' }]}
          >
            <Input placeholder="Введите наименование" />
          </Form.Item>

          <Form.Item
            name="barcodes"
            label="Штрихкоды (через запятую)"
            rules={[{ required: true, message: 'Пожалуйста, введите штрихкоды' }]}
          >
            <Input placeholder="Введите штрихкоды через запятую" />
          </Form.Item>

          <Form.Item
            name="box_quantity"
            label="Количество в коробке"
          >
            <InputNumber
              placeholder="Введите количество в коробке"
              min={1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="vendor_offer_id"
            label="Артикул поставщика"
          >
            <Select
              placeholder="Выберите артикул поставщика"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {vendorProducts.map((vp) => (
                <Option key={vp.offer_id} value={vp.offer_id}>
                  {vp.offer_id} - {vp.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OzonProducts

