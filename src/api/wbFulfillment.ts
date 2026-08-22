import api from './axios'

export interface SellerWarehouse {
  id: number
  name: string
  office_id: number | null
}

export interface Fulfillment {
  id: number
  connection_id: number
  name: string
  seller_warehouses: SellerWarehouse[]
  created_at: string
  updated_at: string
}

export interface FulfillmentCreate {
  name: string
}

export interface FulfillmentUpdate {
  name?: string
}

export interface ProductCategory {
  id: number
  connection_id: number
  name: string
  quantity_per_item: number
  created_at: string
  updated_at: string
}

export interface ProductCategoryCreate {
  name: string
  quantity_per_item: number
}

export interface ProductCategoryUpdate {
  name?: string
  quantity_per_item?: number
}

export interface FulfillmentTariff {
  id: number
  fulfillment_id: number
  product_category_id: number
  price_per_item: string
  created_at: string
  updated_at: string
}

export interface FulfillmentTariffCreate {
  fulfillment_id: number
  product_category_id: number
  price_per_item: number
}

export interface FulfillmentTariffUpdate {
  price_per_item?: number
}

export interface FBSOrderStatus {
  id: number
  supplier_status: string | null
  wb_status: string | null
  history_status: string | null
  status_description: string | null
  set_at: string
}

export interface FBSOrder {
  id: number
  connection_id: number
  supply_id: string | null
  article: string | null
  nm_id: number | null
  warehouse_id: number | null
  warehouse_name: string | null
  fulfillment_id: number | null
  fulfillment_name: string | null
  latest_wb_status: string | null
  wb_created_at: string | null
  created_at: string
  updated_at: string
}

export const fulfillmentsApi = {
  getAll: async (connectionId: number): Promise<Fulfillment[]> => {
    const response = await api.get(`/wildberries/connections/${connectionId}/fulfillments`)
    return response.data
  },

  create: async (connectionId: number, data: FulfillmentCreate): Promise<Fulfillment> => {
    const response = await api.post(`/wildberries/connections/${connectionId}/fulfillments`, data)
    return response.data
  },

  update: async (
    connectionId: number,
    fulfillmentId: number,
    data: FulfillmentUpdate,
  ): Promise<Fulfillment> => {
    const response = await api.put(
      `/wildberries/connections/${connectionId}/fulfillments/${fulfillmentId}`,
      data,
    )
    return response.data
  },

  delete: async (connectionId: number, fulfillmentId: number): Promise<void> => {
    await api.delete(`/wildberries/connections/${connectionId}/fulfillments/${fulfillmentId}`)
  },

  setWarehouses: async (
    connectionId: number,
    fulfillmentId: number,
    sellerWarehouseIds: number[],
  ): Promise<Fulfillment> => {
    const response = await api.put(
      `/wildberries/connections/${connectionId}/fulfillments/${fulfillmentId}/warehouses`,
      { seller_warehouse_ids: sellerWarehouseIds },
    )
    return response.data
  },
}

export const productCategoriesApi = {
  getAll: async (connectionId: number): Promise<ProductCategory[]> => {
    const response = await api.get(`/wildberries/connections/${connectionId}/product-categories`)
    return response.data
  },

  create: async (
    connectionId: number,
    data: ProductCategoryCreate,
  ): Promise<ProductCategory> => {
    const response = await api.post(
      `/wildberries/connections/${connectionId}/product-categories`,
      data,
    )
    return response.data
  },

  update: async (
    connectionId: number,
    productCategoryId: number,
    data: ProductCategoryUpdate,
  ): Promise<ProductCategory> => {
    const response = await api.put(
      `/wildberries/connections/${connectionId}/product-categories/${productCategoryId}`,
      data,
    )
    return response.data
  },

  delete: async (connectionId: number, productCategoryId: number): Promise<void> => {
    await api.delete(
      `/wildberries/connections/${connectionId}/product-categories/${productCategoryId}`,
    )
  },
}

export interface WbProductSizeCategoryAssignment {
  wb_product_id: number
  chrt_id: number
}

export interface WbProductSizeCategory {
  id: number
  wb_product_id: number
  chrt_id: number
  product_category_id: number
  vendor_code: string
  tech_size: string | null
}

export const wbProductSizeCategoriesApi = {
  getForCategory: async (
    connectionId: number,
    productCategoryId: number,
  ): Promise<WbProductSizeCategory[]> => {
    const response = await api.get(
      `/wildberries/connections/${connectionId}/product-categories/${productCategoryId}/size-assignments`,
    )
    return response.data
  },

  setForCategory: async (
    connectionId: number,
    productCategoryId: number,
    assignments: WbProductSizeCategoryAssignment[],
  ): Promise<WbProductSizeCategory[]> => {
    const response = await api.put(
      `/wildberries/connections/${connectionId}/product-categories/${productCategoryId}/size-assignments`,
      { assignments },
    )
    return response.data
  },
}

export const fulfillmentTariffsApi = {
  getAll: async (
    connectionId: number,
    fulfillmentId?: number,
  ): Promise<FulfillmentTariff[]> => {
    const response = await api.get(`/wildberries/connections/${connectionId}/fulfillment-tariffs`, {
      params: fulfillmentId ? { fulfillment_id: fulfillmentId } : undefined,
    })
    return response.data
  },

  create: async (
    connectionId: number,
    data: FulfillmentTariffCreate,
  ): Promise<FulfillmentTariff> => {
    const response = await api.post(
      `/wildberries/connections/${connectionId}/fulfillment-tariffs`,
      data,
    )
    return response.data
  },

  update: async (
    connectionId: number,
    tariffId: number,
    data: FulfillmentTariffUpdate,
  ): Promise<FulfillmentTariff> => {
    const response = await api.put(
      `/wildberries/connections/${connectionId}/fulfillment-tariffs/${tariffId}`,
      data,
    )
    return response.data
  },

  delete: async (connectionId: number, tariffId: number): Promise<void> => {
    await api.delete(`/wildberries/connections/${connectionId}/fulfillment-tariffs/${tariffId}`)
  },
}

export const sellerWarehousesApi = {
  getAll: async (connectionId: number): Promise<SellerWarehouse[]> => {
    const response = await api.get(`/wildberries/connections/${connectionId}/seller-warehouses`)
    return response.data
  },
}

export const fbsOrdersApi = {
  getAll: async (connectionId: number): Promise<FBSOrder[]> => {
    const response = await api.get(`/wildberries/connections/${connectionId}/fbs-orders`)
    return response.data
  },

  getStatuses: async (connectionId: number, fbsOrderId: number): Promise<FBSOrderStatus[]> => {
    const response = await api.get(
      `/wildberries/connections/${connectionId}/fbs-orders/${fbsOrderId}/statuses`,
    )
    return response.data
  },
}

export interface FulfillmentSupplyRow {
  supply_id: string
  supply_created_at: string | null
  fulfillment_name: string | null
  nm_id: number
  tech_size: string | null
  product_category_name: string | null
  package_count: number
  total_quantity: number | null
  price_per_item: string | null
  total_price: string | null
}

export const fulfillmentSuppliesApi = {
  getAll: async (connectionId: number): Promise<FulfillmentSupplyRow[]> => {
    const response = await api.get(
      `/wildberries/connections/${connectionId}/fulfillment-supplies`,
    )
    return response.data
  },

  downloadXlsx: async (connectionId: number): Promise<void> => {
    const response = await api.get(
      `/wildberries/connections/${connectionId}/fulfillment-supplies/xlsx`,
      { responseType: 'blob' },
    )

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Поставки_фулфилмента.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
