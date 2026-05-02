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
  Tag,
} from 'antd'

import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  wbProductsApi,
  type WbProduct,
  type WbProductCreate,
  type WbProductUpdate,
} from '../api/products'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const WbProducts: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const [products, setProducts] = useState<WbProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<WbProduct | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
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
      if (connectionData.company_id) {
        try {
          const companyData = await companiesApi.getById(connectionData.company_id)
          setCompany(companyData)
        } catch {
          setCompany(null)
        }
      }
      const productsData = await wbProductsApi.getAll(parseInt(connectionId))
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

  const handleEdit = (record: WbProduct) => {
    setEditingProduct(record)
    form.setFieldsValue({
      nm_id: record.nm_id,
      vendor_code: record.vendor_code,
      name: record.name,
      barcodes: record.barcodes.join(', '),
      box_quantity: record.box_quantity,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    if (!connectionId) return
    try {
      await wbProductsApi.delete(parseInt(connectionId), id)
      message.success('Товар удалён')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!connectionId) return
      const barcodes = values.barcodes
        ? values.barcodes.split(',').map((b: string) => b.trim()).filter((b: string) => b)
        : []
      const productData: WbProductCreate = {
        nm_id: values.nm_id,
        vendor_code: values.vendor_code,
        name: values.name,
        barcodes,
        box_quantity: values.box_quantity,
      }
      if (editingProduct) {
        const update: WbProductUpdate = { ...productData }
        await wbProductsApi.update(parseInt(connectionId), editingProduct.id, update)
        message.success('Товар обновлён')
      } else {
        await wbProductsApi.create(parseInt(connectionId), productData)
        message.success('Товар создан')
      }
      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const handleSyncFromAPI = async () => {
    if (!connectionId) return
    setSyncing(true)
    try {
      const result = await wbProductsApi.syncFromAPI(parseInt(connectionId))
      message.success(result.message || 'Синхронизация выполнена')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }

  const columns = [
    { title: 'Артикул WB', dataIndex: 'nm_id', key: 'nm_id', width: 120, fixed: 'left' as const },
    { title: 'Артикул', dataIndex: 'vendor_code', key: 'vendor_code', width: 160 },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      ellipsis: true,
    },
    {
      title: 'Штрихкоды',
      dataIndex: 'barcodes',
      key: 'barcodes',
      width: 160,
      render: (barcodes: string[]) => (
        <Space wrap>
          {barcodes.slice(0, 2).map((b, i) => (
            <Tag key={i}>{b}</Tag>
          ))}
          {barcodes.length > 2 && <Tag>+{barcodes.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Кол-во в коробке',
      dataIndex: 'box_quantity',
      key: 'box_quantity',
      width: 120,
      render: (q: number | null) => q ?? <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: WbProduct) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить товар?"
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
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/connections/${connectionId}`)}
              >
                Назад
              </Button>
            </div>
            <div className="crm-split-header__end">
              <Space wrap>
                <Button icon={<SyncOutlined />} loading={syncing} onClick={handleSyncFromAPI}>
                  Синхронизировать с Wildberries
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Добавить товар
                </Button>
              </Space>
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Товары Wildberries{company && ': ' + company.name}
          </Title>
          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1100 }}
            pagination={{
              pageSize: 100,
              showSizeChanger: true,
              showTotal: (total) => `Всего ${total} товаров`,
            }}
          />
        </Space>
      </Card>
      <Modal
        title={editingProduct ? 'Редактировать товар WB' : 'Создать товар WB'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingProduct ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nm_id"
            label="nmID"
            rules={[{ required: true, message: 'Введите nmID' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              disabled={!!editingProduct}
            />
          </Form.Item>
          <Form.Item
            name="vendor_code"
            label="Артикул продавца"
            rules={[{ required: true, message: 'Введите артикул' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="barcodes"
            label="Штрихкоды (через запятую)"
            rules={[{ required: true, message: 'Введите штрихкоды' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="box_quantity" label="Количество в коробке">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WbProducts
