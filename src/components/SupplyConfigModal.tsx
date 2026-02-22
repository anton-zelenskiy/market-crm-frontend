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
import type { SupplyCalculationStrategy } from '../api/supplies'
import type { OzonCluster } from '../api/clusters'
import type { OzonProduct } from '../api/products'
import type { Warehouse } from '../api/supplies'
import {
  DYNAMIC_PERCENTAGES_STRATEGY_DESCRIPTION,
  AVERAGE_SALES_STRATEGY_DESCRIPTION,
  AVERAGE_SALES_WITH_LOCALIZATION_STRATEGY_DESCRIPTION,
} from '../constants'

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
  supply_calculation_strategy: SupplyCalculationStrategy
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
        supply_calculation_strategy: 'average_sales',
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
          supply_calculation_strategy: 'average_sales' as SupplyCalculationStrategy,
          supply_products_to_neighbor_cluster: false,
          fetch_availability: true,
        }}
      >
        <Form.Item
          name="supply_calculation_strategy"
          label="Стратегия расчёта поставки"
          initialValue="average_sales"
        >
          <Select>
            <Option value="average_sales">По средним продажам</Option>
            <Option value="average_sales_with_localization">
              По средним продажам с локализацией
            </Option>
            <Option value="dynamic_percentages">Динамические проценты</Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.supply_calculation_strategy !==
            currentValues.supply_calculation_strategy
          }
        >
          {({ getFieldValue }) => {
            const strategy = getFieldValue('supply_calculation_strategy')
            let strategyDescription = ''
            switch (strategy) {
              case 'dynamic_percentages':
                strategyDescription = DYNAMIC_PERCENTAGES_STRATEGY_DESCRIPTION
                break
              case 'average_sales':
                strategyDescription = AVERAGE_SALES_STRATEGY_DESCRIPTION
                break
              case 'average_sales_with_localization':
                strategyDescription =
                  AVERAGE_SALES_WITH_LOCALIZATION_STRATEGY_DESCRIPTION
                break
            }
            return (
              <div
                style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                  dangerouslySetInnerHTML={{ __html: strategyDescription }}
                />
              </div>
            )
          }}
        </Form.Item>

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
            Проверять доступность складов (фазы B и C). Если снять — будет
            рассчитан только базовый план (фаза A).
          </Checkbox>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.supply_calculation_strategy !==
            currentValues.supply_calculation_strategy
          }
        >
          {() => (
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
          )}
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.supply_calculation_strategy !==
            currentValues.supply_calculation_strategy
          }
        >
          {() => (
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
                {products.map((product) => (
                  <Option key={product.offer_id} value={product.offer_id}>
                    {product.offer_id} — {product.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
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
