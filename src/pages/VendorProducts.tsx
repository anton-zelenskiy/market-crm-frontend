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
  Input,
  InputNumber,
  Popconfirm,
  Upload,
  Tooltip,
  Breadcrumb,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  ClearOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { vendorProductsApi, type VendorProduct, type VendorProductCreate, type VendorProductUpdate } from '../api/products'
import { companiesApi } from '../api/companies'
import { connectionsApi } from '../api/connections'

const { Title } = Typography

const VendorProducts: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null)
  const [form] = Form.useForm()
  const [companyName, setCompanyName] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [syncingGSheet, setSyncingGSheet] = useState(false)

  useEffect(() => {
    if (connectionId) {
      loadData()
    }
  }, [connectionId])

  const loadData = async () => {
    if (!connectionId) return

    setLoading(true)
    try {
      const connection = await connectionsApi.getById(parseInt(connectionId))
      const company = await companiesApi.getById(connection.company_id)
      setCompanyName(company.name)

      const productsData = await vendorProductsApi.getAll(parseInt(connectionId))
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
    if (!connectionId) return

    try {
      await vendorProductsApi.delete(parseInt(connectionId), id)
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

      if (editingProduct) {
        await vendorProductsApi.update(parseInt(connectionId), editingProduct.id, values as VendorProductUpdate)
        message.success('Товар успешно обновлен')
      } else {
        await vendorProductsApi.create(parseInt(connectionId), values as VendorProductCreate)
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
    if (!connectionId) return

    try {
      const result = await vendorProductsApi.syncFromCSV(parseInt(connectionId), file)
      message.success(result.message || `Синхронизировано ${result.products_synced} товаров`)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки CSV файла')
    }
    return false // Prevent default upload
  }

  const handleDownloadTemplate = async () => {
    if (!connectionId) return

    try {
      await vendorProductsApi.downloadSyncCSVTemplate(parseInt(connectionId))
      message.success('Шаблон CSV успешно скачан')
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка скачивания шаблона')
    }
  }

  const handleResetStocks = async () => {
    if (!connectionId) return

    try {
      const result = await vendorProductsApi.resetStocks(parseInt(connectionId))
      message.success(result.message || `Обнулены остатки для ${result.products_updated} товаров`)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка обнуления остатков')
    }
  }

  const handleSyncFromGSheet = async () => {
    if (!connectionId) return

    setSyncingGSheet(true)
    try {
      const result = await vendorProductsApi.syncFromGSheet(parseInt(connectionId))
      message.success(result.message || `Синхронизировано ${result.products_synced} товаров`)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка синхронизации из Google Таблицы')
    } finally {
      setSyncingGSheet(false)
    }
  }

  const columns = [
    {
      title: 'Артикул',
      dataIndex: 'offer_id',
      key: 'offer_id',
      width: 150,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 400,
    },
    {
      title: 'Кол-во на складе',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (quantity: number) => quantity.toLocaleString(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      align: 'right' as const,
      render: (_: any, record: VendorProduct) => (
        <div>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
          </Button>
          <Popconfirm
            title="Вы уверены, что хотите удалить этот товар?"
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

  const filteredProducts = products.filter((product) => {
    const searchLower = searchText.toLowerCase()
    return (
      product.offer_id.toLowerCase().includes(searchLower) ||
      product.name.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div>
      <Card>
        <Space orientation="vertical" style={{ width: '100%', gap: '24px' }} size="large">
          <div className="crm-split-header">
            <div className="crm-split-header__start">
              <Breadcrumb
                items={[
                  { title: <Link to="/connections">API Подключения</Link> },
                  { title: <Link to={`/connections/${connectionId}`}>{companyName || 'Подключение'}</Link> },
                  { title: 'Товары поставщика' },
                ]}
              />
            </div>
            <div className="crm-split-header__end">
              <Space wrap>
                <Tooltip title="Синхронизировать остатки из Google Таблицы, указанной в настройках подключения">
                  <Button
                    icon={<SyncOutlined />}
                    onClick={handleSyncFromGSheet}
                    loading={syncingGSheet}
                  >
                    Синхронизировать из Google Таблицы
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Обнулить остатки?"
                  description="Количество на складе будет установлено в 0 для всех товаров"
                  onConfirm={handleResetStocks}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Tooltip title="Обнулить остатки для всех товаров">
                    <Button icon={<ClearOutlined />} danger>
                      Обнулить остатки
                    </Button>
                  </Tooltip>
                </Popconfirm>
                <Tooltip title="Скачать CSV шаблон с артикулами для заполнения">
                  <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                    Скачать шаблон CSV
                  </Button>
                </Tooltip>
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
          </div>

          <Title level={2} style={{ margin: 0 }}>
            Товары поставщика: {companyName}
          </Title>

          <Input
            placeholder="Поиск по артикулу или названию"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: '100%', maxWidth: 420 }}
          />

          <Table
            columns={columns}
            dataSource={filteredProducts}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            size='small'
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего ${total} товаров` }}
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

