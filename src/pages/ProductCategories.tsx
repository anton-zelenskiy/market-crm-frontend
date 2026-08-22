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
  Breadcrumb,
  Transfer,
} from 'antd'
import type { TransferProps } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined } from '@ant-design/icons'
import {
  productCategoriesApi,
  wbProductSizeCategoriesApi,
  type ProductCategory,
  type ProductCategoryCreate,
} from '../api/wbFulfillment'
import { wbProductsApi, type WbProduct } from '../api/products'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const sizeKey = (wbProductId: number, chrtId: number) => `${wbProductId}:${chrtId}`

const ProductCategories: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const connId = connectionId ? parseInt(connectionId) : 0

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<WbProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [form] = Form.useForm()

  const [sizeModalVisible, setSizeModalVisible] = useState(false)
  const [sizeModalLoading, setSizeModalLoading] = useState(false)
  const [sizeCategory, setSizeCategory] = useState<ProductCategory | null>(null)
  const [sizeTargetKeys, setSizeTargetKeys] = useState<string[]>([])

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
      const [categoriesData, productsData] = await Promise.all([
        productCategoriesApi.getAll(connId),
        wbProductsApi.getAll(connId),
      ])
      setCategories(categoriesData)
      setProducts(productsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки категорий')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: ProductCategory) => {
    setEditingCategory(record)
    form.setFieldsValue({ name: record.name, quantity_per_item: record.quantity_per_item })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await productCategoriesApi.delete(connId, id)
      message.success('Категория удалена')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: ProductCategoryCreate = {
        name: values.name,
        quantity_per_item: values.quantity_per_item,
      }
      if (editingCategory) {
        await productCategoriesApi.update(connId, editingCategory.id, data)
        message.success('Категория обновлена')
      } else {
        await productCategoriesApi.create(connId, data)
        message.success('Категория создана')
      }
      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const openSizeModal = async (category: ProductCategory) => {
    setSizeCategory(category)
    setSizeModalVisible(true)
    setSizeModalLoading(true)
    try {
      const assignments = await wbProductSizeCategoriesApi.getForCategory(connId, category.id)
      setSizeTargetKeys(assignments.map((a) => sizeKey(a.wb_product_id, a.chrt_id)))
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки товаров категории')
    } finally {
      setSizeModalLoading(false)
    }
  }

  const handleSizeSubmit = async () => {
    if (!sizeCategory) return
    try {
      const assignments = sizeTargetKeys.map((key) => {
        const [wbProductId, chrtId] = key.split(':').map(Number)
        return { wb_product_id: wbProductId, chrt_id: chrtId }
      })
      await wbProductSizeCategoriesApi.setForCategory(connId, sizeCategory.id, assignments)
      message.success('Товары обновлены')
      setSizeModalVisible(false)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const sizeTransferDataSource = products.flatMap((p) =>
    p.sizes.map((s) => ({
      key: sizeKey(p.id, s.chrt_id),
      title: `${p.vendor_code} — ${s.tech_size || s.chrt_id}`,
    })),
  )

  const sizeFilterOption: TransferProps['filterOption'] = (inputValue, item) =>
    item.title!.toLowerCase().includes(inputValue.toLowerCase())

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Кол-во в упаковке', dataIndex: 'quantity_per_item', key: 'quantity_per_item' },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: ProductCategory) => (
        <Space>
          <Button
            type="link"
            icon={<TagsOutlined />}
            title="Товары и размеры"
            onClick={() => openSizeModal(record)}
          />
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Удалить категорию?"
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
                  { title: 'Категории товаров' },
                ]}
              />
            </div>
            <div className="crm-split-header__end">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Добавить категорию
              </Button>
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Категории товаров{company && ': ' + company.name}
          </Title>
          <Table columns={columns} dataSource={categories} rowKey="id" loading={loading} pagination={false} />
        </Space>
      </Card>

      <Modal
        title={editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingCategory ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="quantity_per_item"
            label="Кол-во в упаковке"
            rules={[{ required: true, message: 'Введите количество' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Товары и размеры: ${sizeCategory?.name || ''}`}
        open={sizeModalVisible}
        onOk={handleSizeSubmit}
        onCancel={() => setSizeModalVisible(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={760}
        confirmLoading={sizeModalLoading}
      >
        <Transfer
          dataSource={sizeTransferDataSource}
          titles={['Доступные размеры', 'В этой категории']}
          targetKeys={sizeTargetKeys}
          onChange={(keys) => setSizeTargetKeys(keys as string[])}
          render={(item) => item.title!}
          showSearch
          filterOption={sizeFilterOption}
          listStyle={{ width: 340, height: 400 }}
          disabled={sizeModalLoading}
        />
      </Modal>
    </div>
  )
}

export default ProductCategories
