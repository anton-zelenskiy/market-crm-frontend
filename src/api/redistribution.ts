import api from './axios'

export interface RedistributionOrder {
  id: number
  user_id: number
  connection_id: number
  company_name: string
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
  company_name: string
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
}

export interface WarehouseDestination {
  office_name: string
  office_id: number
}

export interface StockInfo {
  src: WarehouseStock[]
  dst: WarehouseDestination[]
}

export interface GoodsReturnItem {
  brand_name: string
  subject_name: string
  ts_name: string
  nm_id: number
  office_id: number
  office_address: string
  status_id: string
  payment_type: string
  order_date: string
  count: number | null
}

const BASE_PATH = '/supplies/wildberries/redistribution-orders'

export const redistributionApi = {
  async create(data: CreateRedistributionOrderRequest): Promise<RedistributionOrder> {
    const response = await api.post<RedistributionOrder>(`${BASE_PATH}/`, data)
    return response.data
  },

  async list(connectionId: number): Promise<RedistributionOrder[]> {
    const response = await api.get<RedistributionOrder[]>(`${BASE_PATH}/`, {
      params: { connection_id: connectionId },
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

  async getStockInfo(connectionId: number, nmId: number): Promise<StockInfo> {
    const response = await api.get<StockInfo>(`${BASE_PATH}/stocks/info`, {
      params: { connection_id: connectionId, nm_id: nmId },
    })
    return response.data
  },

  async listMovements(
    connectionId: number,
    dateFrom: string,
    dateTo: string,
    nmId?: number
  ): Promise<GoodsReturnItem[]> {
    const response = await api.get<GoodsReturnItem[]>(`${BASE_PATH}/movements/list`, {
      params: {
        connection_id: connectionId,
        date_from: dateFrom,
        date_to: dateTo,
        ...(nmId && { nm_id: nmId }),
      },
    })
    return response.data
  },
}
