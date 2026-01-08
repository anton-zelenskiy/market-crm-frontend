import api from './axios'

export interface SupplyOrder {
  order_id: number
  order_number: string
  supply_id: string
  state: string
  created_date: string
  storage_warehouse_name: string | null
  cargoes_count: number | null
  errors: string[] | null
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

export interface SupplySnapshotResponse {
  id: number
  connection_id: number
  data: Array<{
    offer_id: string
    sku: number
    name: string
    box_count: number
    vendor_stocks_count: number
    [clusterName: string]: any
    totals: {
      marketplace_stocks_count: number
      orders_count: number
      avg_orders_leverage: number
      vendor_stocks_count: number
      to_supply: number
      deficit: number
    }
  }>
  updated_at: string
}

export interface Warehouse {
  warehouse_id: number
  name: string
  address?: string
  warehouse_type?: string
}

export interface DropOffWarehouse {
  warehouse_id: number
  name: string
  address?: string | null
}

export interface CreateSupplyDraftRequest {
  connection_id: number
  supply_data_snapshot_id: number
  drop_off_warehouse: DropOffWarehouse
  cluster_name: string
  items: Array<{ sku: number; quantity: number }>
}

export interface SupplyDraft {
  id: number
  connection_id: number
  cluster_name: string
  snapshot_data: any
  payload: any
  operation_id: string | null
  draft_id: number | null
  status: string | null
  errors: any | null
  supply_warehouses: Array<{
    bundle_ids: Array<{
      bundle_id: string
      is_docless: boolean
    }>
    restricted_bundle_id: string
    status: {
      invalid_reason: string
      is_available: boolean
      state: string
    }
    supply_warehouse: {
      address: string
      name: string
      warehouse_id: number
    }
    total_rank: number
    total_score: number
    travel_time_days: number
  }> | null
  drop_off_warehouse_name: string | null  // Deprecated
  drop_off_warehouse: DropOffWarehouse | null
  create_supply_operation_id: string | null
  order_ids: string[] | null
  created_at: string
  updated_at: string
}

export interface Timeslot {
  from_in_timezone: string
  to_in_timezone: string
}

export interface DayTimeslots {
  date_in_timezone: string
  timeslots: Timeslot[]
}

export interface WarehouseTimeslots {
  current_time_in_timezone: string
  days: DayTimeslots[]
  drop_off_warehouse_id: number
  warehouse_timezone: string
}

export interface DraftTimeslotRequest {
  date_from: string
  date_to: string
}

export interface DraftTimeslotResponse {
  drop_off_warehouse_timeslots: WarehouseTimeslots[]
  requested_date_from: string
  requested_date_to: string
}

export interface CreateSupplyFromDraftRequest {
  warehouse_id: number
  timeslot: Timeslot
}

export interface CreateSupplyFromDraftResponse {
  operation_id: string
}

export interface SupplyCreateStatusRequest {
  operation_id: string
}

export interface SupplyCreateStatusResult {
  order_ids: string[] | null
}

export interface SupplyCreateStatusResponse {
  error_messages: string[] | null
  result: SupplyCreateStatusResult | null
  status: string
}

export interface SupplyDraftListResponse {
  drafts: SupplyDraft[]
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

  getSnapshots: async (
    connectionId: number
  ): Promise<SupplySnapshotResponse[]> => {
    const response = await api.get(`/supplies/connection/${connectionId}/snapshots`)
    return response.data
  },

  getSnapshot: async (
    snapshotId: number
  ): Promise<SupplySnapshotResponse> => {
    const response = await api.get(`/supplies/snapshot/${snapshotId}`)
    return response.data
  },

  createSnapshot: async (
    connectionId: number,
    file?: File
  ): Promise<SupplySnapshotResponse> => {
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post(
        `/supplies/connection/${connectionId}/snapshot/create`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    }

    const response = await api.post(
      `/supplies/connection/${connectionId}/snapshot/create`
    )
    return response.data
  },

  refreshSnapshot: async (
    snapshotId: number
  ): Promise<SupplySnapshotResponse> => {
    const response = await api.post(`/supplies/snapshot/${snapshotId}/refresh`)
    return response.data
  },

  deleteSnapshot: async (snapshotId: number): Promise<void> => {
    await api.delete(`/supplies/snapshot/${snapshotId}`)
  },

  getWarehouses: async (
    connectionId: number,
    search?: string
  ): Promise<Warehouse[]> => {
    const params = new URLSearchParams({
      connection_id: connectionId.toString(),
    })
    if (search) {
      params.append('search', search)
    }
    const response = await api.get(`/supplies/warehouses/?${params.toString()}`)
    return response.data
  },

  createSupplyDraft: async (
    request: CreateSupplyDraftRequest
  ): Promise<SupplyDraft> => {
    const response = await api.post('/supplies/supply-draft', request)
    return response.data
  },

  deleteSupplyDraft: async (draftId: number): Promise<void> => {
    await api.delete(`/supplies/supply-draft/${draftId}`)
  },

  getConnectionDrafts: async (
    connectionId: number
  ): Promise<SupplyDraftListResponse> => {
    const response = await api.get(`/supplies/connection/${connectionId}/drafts`)
    return response.data
  },

  getDraftTimeslots: async (
    draftId: number,
    request: DraftTimeslotRequest
  ): Promise<DraftTimeslotResponse> => {
    const response = await api.post(
      `/supplies/supply-draft/${draftId}/timeslots`,
      request
    )
    return response.data
  },

  createSupplyFromDraft: async (
    draftId: number,
    request: CreateSupplyFromDraftRequest
  ): Promise<CreateSupplyFromDraftResponse> => {
    const response = await api.post(
      `/supplies/supply-draft/${draftId}/create-supply`,
      request
    )
    return response.data
  },

  getSupplyCreateStatus: async (
    draftId: number,
    request: SupplyCreateStatusRequest
  ): Promise<SupplyCreateStatusResponse> => {
    const response = await api.post(
      `/supplies/supply-draft/${draftId}/create-supply-status`,
      request
    )
    return response.data
  },

  downloadDeficitCsv: async (snapshotId: number): Promise<Blob> => {
    const response = await api.get(
      `/supplies/snapshot/${snapshotId}/deficit-csv`,
      {
        responseType: 'blob',
      }
    )
    return response.data
  },

  downloadAvailabilityCsv: async (snapshotId: number): Promise<Blob> => {
    const response = await api.get(
      `/supplies/snapshot/${snapshotId}/availability-csv`,
      {
        responseType: 'blob',
      }
    )
    return response.data
  },

  downloadFullSnapshotXlsx: async (snapshotId: number): Promise<Blob> => {
    const response = await api.get(
      `/supplies/snapshot/${snapshotId}/xlsx`,
      {
        responseType: 'blob',
      }
    )
    return response.data
  },
}

export async function saveSupplySnapshot(
  snapshotId: number,
  data: SupplySnapshotResponse['data']
): Promise<SupplySnapshotResponse> {
  const response = await api.put<SupplySnapshotResponse>(
    `/supplies/snapshot/${snapshotId}`,
    { data }
  )
  return response.data
}

