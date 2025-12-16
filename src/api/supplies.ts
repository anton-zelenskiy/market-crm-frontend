import api from './axios'

export interface SupplyOrder {
  order_id: number
  order_number: string
  state: string
  created_date: string
  storage_warehouse_name: string | null
}

export interface SupplyOrdersResponse {
  orders: SupplyOrder[]
  total: number
}

export interface SupplyOrderListRequest {
  states?: string[]
  limit?: number
}

export const suppliesApi = {
  getByConnectionId: async (
    connectionId: number,
    request: SupplyOrderListRequest = {}
  ): Promise<SupplyOrdersResponse> => {
    const response = await api.post(`/supplies/connection/${connectionId}`, request)
    return response.data
  },
}

