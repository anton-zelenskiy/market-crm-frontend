import api from './axios'

export interface RedistributionOrder {
  id: number
  user_id: number
  connection_id: number
  company_slug: string
  nm_id: number
  chrt_id: number
  tech_size: string
  src_office_id: number
  src_office_name: string
  dst_office_id: number
  dst_office_name: string
  count: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed'
  error_message: string | null
  moved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateRedistributionOrderRequest {
  connection_id: number
  company_slug: string
  nm_id: number
  chrt_id: number
  tech_size: string
  src_office_id: number
  src_office_name: string
  dst_office_id: number
  dst_office_name: string
  count: number
}

export interface StockItem {
  chrt_id: number
  count: number
  tech_size: string
}

export interface WarehouseStock {
  office_name: string
  office_id: number
  in_stock: StockItem[]
  dst_warehouse_ids?: number[]
}

export interface WarehouseDestination {
  office_name: string
  office_id: number
}

export interface StockInfo {
  src: WarehouseStock[]
  dst: WarehouseDestination[]
}

export interface RedistributionOrderListResponse {
  items: RedistributionOrder[]
  total: number
  limit: number
  offset: number
}

export type RedistributionOrderStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed'

const BASE_PATH = '/supplies/wildberries/redistribution-orders'

export const redistributionApi = {
  async create(data: CreateRedistributionOrderRequest): Promise<RedistributionOrder> {
    const response = await api.post<RedistributionOrder>(`${BASE_PATH}/`, data)
    return response.data
  },

  async list(
    connectionId: number,
    options?: {
      status?: RedistributionOrderStatus
      limit?: number
      offset?: number
    }
  ): Promise<RedistributionOrderListResponse> {
    const response = await api.get<RedistributionOrderListResponse>(`${BASE_PATH}/`, {
      params: {
        connection_id: connectionId,
        status: options?.status ?? 'pending',
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      },
    })
    return response.data
  },

  async getById(orderId: number): Promise<RedistributionOrder> {
    const response = await api.get<RedistributionOrder>(`${BASE_PATH}/${orderId}`)
    return response.data
  },

  async cancel(orderId: number): Promise<void> {
    await api.delete(`${BASE_PATH}/${orderId}`)
  },

  async getStockInfo(
    connectionId: number,
    companySlug: string,
    nmId: number
  ): Promise<StockInfo> {
    const response = await api.get<StockInfo>(`${BASE_PATH}/stocks/info`, {
      params: { connection_id: connectionId, company_slug: companySlug, nm_id: nmId },
    })
    return response.data
  },

  async exportPaidOrders(connectionId: number): Promise<Blob> {
    const response = await api.get(`${BASE_PATH}/paid-export`, {
      params: { connection_id: connectionId },
      responseType: 'blob',
    })
    return response.data
  },
}
