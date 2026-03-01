import React, { useEffect, useRef } from 'react'
import {
  Modal,
  Form,
  Select,
  Checkbox,
  Spin,
  Empty,
  Alert,
} from 'antd'
import type { OzonCluster } from '../api/clusters'
import type { OzonProduct } from '../api/products'
import type { Warehouse } from '../api/supplies'

const { Option } = Select

const getWarehouseTypeLabel = (warehouseType: string | undefined): string => {
  const typeMap: Record<string, string> = {
    WAREHOUSE_TYPE_DELIVERY_POINT: 'Пункт выдачи заказов',
    WAREHOUSE_TYPE_ORDERS_RECEIVING_POINT: 'Пункт приёма заказов',
    WAREHOUSE_TYPE_SORTING_CENTER: 'Сортировочный центр',
    WAREHOUSE_TYPE_FULL_FILLMENT: 'Фулфилмент',
    WAREHOUSE_TYPE_CROSS_DOCK: 'Кросс-докинг',
  }
  return warehouseType ? typeMap[warehouseType] || warehouseType : ''
}

export interface SupplyConfigFormValues {
  supply_products_to_neighbor_cluster: boolean
  fetch_availability: boolean
  cluster_ids?: number[]
  offer_ids?: string[]
  drop_off_warehouse_id?: number
}

export interface SupplyConfigModalProps {
  visible: boolean
  title: string
  okText: string
  cancelText: string
  confirmLoading?: boolean
  onOk: (values: SupplyConfigFormValues) => void | Promise<void>
  onCancel: () => void
  mode: 'create' | 'settings'
  initialValues?: Partial<SupplyConfigFormValues>
  clusters: OzonCluster[]
  products: OzonProduct[]
  warehouses: Warehouse[]
  loadingClusters: boolean
  loadingProducts: boolean
  warehouseLoading: boolean
  onWarehouseSearch: (value: string) => void
}

const SupplyConfigModal: React.FC<SupplyConfigModalProps> = ({
  visible,
  title,
  okText,
  cancelText,
  confirmLoading = false,
  onOk,
  onCancel,
  mode,
  initialValues,
  clusters,
  products,
  warehouses,
  loadingClusters,
  loadingProducts,
  warehouseLoading,
  onWarehouseSearch,
}) => {
  const [form] = Form.useForm<SupplyConfigFormValues>()
  const initialValuesRef = useRef(initialValues)
  initialValuesRef.current = initialValues

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        supply_products_to_neighbor_cluster: false,
        fetch_availability: true,
        cluster_ids: [],
        offer_ids: [],
        ...initialValuesRef.current,
      })
    } else {
      form.resetFields()
    }
  }, [visible, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await onOk(values as SupplyConfigFormValues)
    } catch {
      // validation failed or onOk threw
    }
  }

  return (
    <Modal
      title={title}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText={okText}
      cancelText={cancelText}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          supply_products_to_neighbor_cluster: false,
          fetch_availability: true,
        }}
      >
        <Form.Item
          name="supply_products_to_neighbor_cluster"
          valuePropName="checked"
        >
          <Checkbox>
            Поставить товар в соседний кластер (если есть ограничения)
          </Checkbox>
        </Form.Item>

        <Form.Item name="fetch_availability" valuePropName="checked">
          <Checkbox>
            Проверять доступность складов. Если снять — будет
            рассчитан только базовый план.
          </Checkbox>
        </Form.Item>

        <Form.Item
          name="cluster_ids"
          label="Кластеры (если не выбрано — все)"
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Выберите кластеры"
            loading={loadingClusters}
            optionFilterProp="children"
            showSearch
          >
            {clusters
              .sort((a, b) => a.priority - b.priority)
              .map((cluster) => (
                <Option
                  key={cluster.cluster_id}
                  value={cluster.cluster_id}
                >
                  {cluster.name}
                </Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="offer_ids"
          label="Товары (если не выбрано — все)"
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Выберите товары"
            loading={loadingProducts}
            optionFilterProp="children"
            showSearch
          >
            {/* sort products by vendor_quantity in descending order, then by offer_id in ascending order */}
            {products.sort((a, b) => (b.vendor_quantity || 0) - (a.vendor_quantity || 0) || a.offer_id.localeCompare(b.offer_id)).map((product) => (
              <Option key={product.offer_id} value={product.offer_id}>
                {product.offer_id} ({product.vendor_quantity} шт.) — {product.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="drop_off_warehouse_id"
          label="Склад отгрузки"
          rules={[
            { required: true, message: 'Необходимо выбрать склад отгрузки' },
          ]}
        >
          <Select
            placeholder="Введите название склада (минимум 4 символа)"
            showSearch
            allowClear
            filterOption={false}
            onSearch={onWarehouseSearch}
            loading={warehouseLoading}
            notFoundContent={
              warehouseLoading ? (
                <Spin size="small" />
              ) : (
                <Empty description="Введите название склада" />
              )
            }
          >
            {warehouses.map((warehouse) => (
              <Option
                key={warehouse.warehouse_id}
                value={warehouse.warehouse_id}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{warehouse.name}</div>
                  {warehouse.address && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {warehouse.address}
                    </div>
                  )}
                  {warehouse.warehouse_type && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      Тип:{' '}
                      {getWarehouseTypeLabel(warehouse.warehouse_type)}
                    </div>
                  )}
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {mode === 'settings' && (
          <Alert
            title="Информация"
            description="При сохранении данные будут обновлены с Ozon и пересчитаны с указанными параметрами."
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Form>
    </Modal>
  )
}

export default SupplyConfigModal
