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
  Tag,
  Breadcrumb,
  Transfer,
  Select,
} from 'antd'
import type { TransferProps } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons'
import {
  fulfillmentsApi,
  productCategoriesApi,
  fulfillmentTariffsApi,
  sellerWarehousesApi,
  type Fulfillment,
  type ProductCategory,
  type FulfillmentTariff,
  type SellerWarehouse,
} from '../api/wbFulfillment'
import { connectionsApi } from '../api/connections'
import { companiesApi, type Company } from '../api/companies'

const { Title } = Typography

const Fulfillments: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>()
  const connId = connectionId ? parseInt(connectionId) : 0

  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [tariffs, setTariffs] = useState<FulfillmentTariff[]>([])
  const [warehouses, setWarehouses] = useState<SellerWarehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingFulfillment, setEditingFulfillment] = useState<Fulfillment | null>(null)
  const [form] = Form.useForm()

  const [warehouseModalVisible, setWarehouseModalVisible] = useState(false)
  const [warehouseTarget, setWarehouseTarget] = useState<Fulfillment | null>(null)
  const [targetKeys, setTargetKeys] = useState<string[]>([])

  const [tariffModalVisible, setTariffModalVisible] = useState(false)
  const [tariffFulfillment, setTariffFulfillment] = useState<Fulfillment | null>(null)
  const [editingTariff, setEditingTariff] = useState<FulfillmentTariff | null>(null)
  const [tariffForm] = Form.useForm()

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
      const [fulfillmentsData, categoriesData, warehousesData, tariffsData] = await Promise.all([
        fulfillmentsApi.getAll(connId),
        productCategoriesApi.getAll(connId),
        sellerWarehousesApi.getAll(connId),
        fulfillmentTariffsApi.getAll(connId),
      ])
      setFulfillments(fulfillmentsData)
      setCategories(categoriesData)
      setWarehouses(warehousesData)
      setTariffs(tariffsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingFulfillment(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Fulfillment) => {
    setEditingFulfillment(record)
    form.setFieldsValue({ name: record.name })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fulfillmentsApi.delete(connId, id)
      message.success('Фулфилмент удалён')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingFulfillment) {
        await fulfillmentsApi.update(connId, editingFulfillment.id, { name: values.name })
        message.success('Фулфилмент обновлён')
      } else {
        await fulfillmentsApi.create(connId, { name: values.name })
        message.success('Фулфилмент создан')
      }
      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const openWarehouseModal = (record: Fulfillment) => {
    setWarehouseTarget(record)
    setTargetKeys(record.seller_warehouses.map((w) => String(w.id)))
    setWarehouseModalVisible(true)
  }

  const handleWarehousesSubmit = async () => {
    if (!warehouseTarget) return
    try {
      await fulfillmentsApi.setWarehouses(
        connId,
        warehouseTarget.id,
        targetKeys.map((k) => parseInt(k)),
      )
      message.success('Склады обновлены')
      setWarehouseModalVisible(false)
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка сохранения складов')
    }
  }

  const openTariffModal = (fulfillment: Fulfillment, tariff: FulfillmentTariff | null) => {
    setTariffFulfillment(fulfillment)
    setEditingTariff(tariff)
    tariffForm.resetFields()
    if (tariff) {
      tariffForm.setFieldsValue({
        product_category_id: tariff.product_category_id,
        price_per_item: parseFloat(tariff.price_per_item),
      })
    }
    setTariffModalVisible(true)
  }

  const handleTariffSubmit = async () => {
    if (!tariffFulfillment) return
    try {
      const values = await tariffForm.validateFields()
      if (editingTariff) {
        await fulfillmentTariffsApi.update(connId, editingTariff.id, {
          price_per_item: values.price_per_item,
        })
        message.success('Тариф обновлён')
      } else {
        await fulfillmentTariffsApi.create(connId, {
          fulfillment_id: tariffFulfillment.id,
          product_category_id: values.product_category_id,
          price_per_item: values.price_per_item,
        })
        message.success('Тариф создан')
      }
      setTariffModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Ошибка сохранения тарифа')
    }
  }

  const handleTariffDelete = async (id: number) => {
    try {
      await fulfillmentTariffsApi.delete(connId, id)
      message.success('Тариф удалён')
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name || `#${id}`

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Склады',
      key: 'warehouses',
      render: (_: unknown, record: Fulfillment) => (
        <Space wrap>
          {record.seller_warehouses.slice(0, 3).map((w) => (
            <Tag key={w.id}>{w.name}</Tag>
          ))}
          {record.seller_warehouses.length > 3 && (
            <Tag>+{record.seller_warehouses.length - 3}</Tag>
          )}
          {record.seller_warehouses.length === 0 && <span style={{ color: '#999' }}>—</span>}
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: Fulfillment) => (
        <Space>
          <Button
            type="link"
            icon={<ApartmentOutlined />}
            onClick={() => openWarehouseModal(record)}
            title="Склады"
          />
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Удалить фулфилмент?"
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

  const transferDataSource = warehouses.map((w) => ({
    key: String(w.id),
    title: w.name,
  }))

  const filterOption: TransferProps['filterOption'] = (inputValue, item) =>
    item.title!.toLowerCase().includes(inputValue.toLowerCase())

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
                  { title: 'Фулфилменты' },
                ]}
              />
            </div>
            <div className="crm-split-header__end">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Добавить фулфилмент
              </Button>
            </div>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Фулфилменты{company && ': ' + company.name}
          </Title>
          <Table
            columns={columns}
            dataSource={fulfillments}
            rowKey="id"
            loading={loading}
            pagination={false}
            expandable={{
              expandedRowRender: (record: Fulfillment) => {
                const rowTariffs = tariffs.filter((t) => t.fulfillment_id === record.id)
                return (
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography.Text strong>Тарифы</Typography.Text>
                      <Button size="small" onClick={() => openTariffModal(record, null)}>
                        Добавить тариф
                      </Button>
                    </div>
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="id"
                      dataSource={rowTariffs}
                      columns={[
                        {
                          title: 'Категория товара',
                          dataIndex: 'product_category_id',
                          render: (id: number) => categoryName(id),
                        },
                        { title: 'Цена за единицу', dataIndex: 'price_per_item' },
                        {
                          title: '',
                          key: 'actions',
                          width: 100,
                          render: (_: unknown, tariff: FulfillmentTariff) => (
                            <Space>
                              <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openTariffModal(record, tariff)}
                              />
                              <Popconfirm
                                title="Удалить тариф?"
                                onConfirm={() => handleTariffDelete(tariff.id)}
                                okText="Да"
                                cancelText="Нет"
                              >
                                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </div>
                )
              },
            }}
          />
        </Space>
      </Card>

      <Modal
        title={editingFulfillment ? 'Редактировать фулфилмент' : 'Создать фулфилмент'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingFulfillment ? 'Обновить' : 'Создать'}
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
        </Form>
      </Modal>

      <Modal
        title={`Склады: ${warehouseTarget?.name || ''}`}
        open={warehouseModalVisible}
        onOk={handleWarehousesSubmit}
        onCancel={() => setWarehouseModalVisible(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={720}
      >
        <Transfer
          dataSource={transferDataSource}
          titles={['Доступные склады', 'Назначенные склады']}
          targetKeys={targetKeys}
          onChange={(keys) => setTargetKeys(keys as string[])}
          render={(item) => item.title!}
          showSearch
          filterOption={filterOption}
          listStyle={{ width: 300, height: 360 }}
        />
      </Modal>

      <Modal
        title={editingTariff ? 'Редактировать тариф' : 'Добавить тариф'}
        open={tariffModalVisible}
        onOk={handleTariffSubmit}
        onCancel={() => setTariffModalVisible(false)}
        okText={editingTariff ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={tariffForm} layout="vertical">
          <Form.Item
            name="product_category_id"
            label="Категория товара"
            rules={[{ required: true, message: 'Выберите категорию' }]}
          >
            <Select
              disabled={!!editingTariff}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            name="price_per_item"
            label="Цена за единицу"
            rules={[{ required: true, message: 'Введите цену' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Fulfillments
