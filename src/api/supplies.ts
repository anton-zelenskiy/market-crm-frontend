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

export interface CreateCargoesRequest {
  connection_id: number
  order_id: string
  delete_current_version?: boolean
}

export interface CreateCargoesResponse {
  id: number
  connection_id: number
  supply_id: string
  operation_id: string
  cargoes: Record<string, any>
  errors: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface DownloadDocumentsRequest {
  connection_id: number
  order_id: string
  external_order_id: string
}

export const suppliesApi = {
  getByConnectionId: async (
    connectionId: number,
    request: SupplyOrderListRequest = {}
  ): Promise<SupplyOrdersResponse> => {
    const response = await api.post(`/supplies/connection/${connectionId}`, request)
    return response.data
  },

  createCargoes: async (
    supplyId: string,
    request: CreateCargoesRequest
  ): Promise<CreateCargoesResponse> => {
    const params = new URLSearchParams({
      connection_id: request.connection_id.toString(),
      order_id: request.order_id,
      delete_current_version: (request.delete_current_version ?? true).toString(),
    })
    const response = await api.post(`/supplies/${supplyId}/cargoes?${params}`)
    return response.data
  },

  downloadDocuments: async (
    supplyId: string,
    request: DownloadDocumentsRequest
  ): Promise<Blob> => {
    const params = new URLSearchParams({
      connection_id: request.connection_id.toString(),
      order_id: request.order_id,
      external_order_id: request.external_order_id,
    })
    const response = await api.get(`/supplies/${supplyId}/documents?${params}`, {
      responseType: 'blob',
    })
    return response.data
  },
}

