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

export type SupplyCalculationStrategy =
  | 'average_sales'
  | 'supply_plan'
  | 'fixed_percentages'
  | 'manual_xlsx'

export interface ClusterData {
  marketplace_stocks_count: number
  orders_count: number
  avg_orders_leverage: number
  to_supply: number
  cluster_id: number
  macrolocal_cluster_id: number | null
  restricted_quantity?: number
  warehouse_availability?: Record<string, any>
  is_neighbor_redirect?: boolean
}

export interface SupplyDataItem {
  offer_id: string
  sku: number
  name: string
  box_count: number
  vendor_stocks_count: number
  [clusterName: string]: ClusterData | any
  totals: {
    marketplace_stocks_count: number
    orders_count: number
    avg_orders_leverage: number
    vendor_stocks_count: number
    to_supply: number
    deficit: number
  }
}

export interface SupplySnapshotResponse {
  id: number
  connection_id: number
  data: SupplyDataItem[]
  updated_at: string
  // Configuration fields
  cluster_ids: number[] | null
  offer_ids: string[] | null
  supply_calculation_strategy: SupplyCalculationStrategy | null
  supply_products_to_neighbor_cluster: boolean | null
  drop_off_warehouse: DropOffWarehouse | null
}

export interface CreateSnapshotConfig {
  cluster_ids?: number[]
  offer_ids?: string[]
  supply_calculation_strategy?: SupplyCalculationStrategy
  supply_products_to_neighbor_cluster?: boolean
  drop_off_warehouse?: DropOffWarehouse
}

export interface CreateSnapshotResponse {
  snapshot_id: number
  task_id: string
}

export interface RefreshSnapshotConfig {
  cluster_ids?: number[] | null
  offer_ids?: string[] | null
  supply_calculation_strategy?: SupplyCalculationStrategy | null
  supply_products_to_neighbor_cluster?: boolean | null
  drop_off_warehouse?: DropOffWarehouse
}

export interface RefreshSnapshotResponse {
  snapshot_id: number
  task_id: string
}

export interface ProgressData {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'error'
  stage: string
  progress: number
  message?: string
  error?: string
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

export interface BundleItem {
  sku: number
  offer_id: string
  quantity: number
}

// V2 API interfaces
export interface CreateCrossdockDraftRequest {
  connection_id: number
  supply_data_snapshot_id: number
  drop_off_warehouse: DropOffWarehouse
  cluster_name: string
  items: BundleItem[]
  deletion_sku_mode?: string
}

export type WarehouseAvailabilityState =
  | 'FULL_AVAILABLE'
  | 'PARTIAL_AVAILABLE'
  | 'NOT_AVAILABLE'
  | 'UNSPECIFIED'

export const WAREHOUSE_AVAILABILITY_STATE_DESCRIPTION: Record<WarehouseAvailabilityState, string> = {
  FULL_AVAILABLE: 'Примет все товары',
  PARTIAL_AVAILABLE: 'Примет часть товаров',
  NOT_AVAILABLE: 'Не может принимать товары',
  UNSPECIFIED: 'Неизвестно',
};
  

export interface DraftProductInfo {
  offer_id: string
  quantity: number
  product_name: string | null
  expected_quantity: number
  original_quantity?: number | null
}

export interface DraftCluster {
  macrolocal_cluster_id: number
  cluster_name: string
}

export interface DraftStorageWarehouse {
  bundle_id?: string
  restricted_bundle_id?: string
  storage_warehouse?: {
    address?: string
    name: string
    warehouse_id: number
  }
  availability_status?: {
    invalid_reason?: string
    state?: WarehouseAvailabilityState | string
  }
  total_rank?: number
  total_score?: number
  travel_time_days?: number
  supply_tags?: string[]
  state?: WarehouseAvailabilityState
  products?: DraftProductInfo[]
}

export interface SupplyDraft {
  id: number
  connection_id: number
  draft_id: number | null
  cluster: DraftCluster
  status: string | null
  errors: any[] | null
  storage_warehouses: DraftStorageWarehouse[]
  drop_off_warehouse: DropOffWarehouse | null
  supply_create_info?: {
    error_reasons?: string[] | null
    order_id?: number | null
    status: string
  } | null
  storage_warehouse_name?: string | null
  created_at: string
  updated_at: string
}

export interface Timeslot {
  from_in_timezone: string
  to_in_timezone: string
}

// V2 API interfaces
export interface SelectedClusterWarehouse {
  macrolocal_cluster_id: number
  storage_warehouse_id: number
}

export interface DraftTimeslotRequestV2 {
  date_from: string
  date_to: string
  selected_cluster_warehouses: SelectedClusterWarehouse[]
}

export interface DraftTimeslotResponseV2 {
  error_reason?: string | null
  result?: {
    drop_off_warehouse_timeslots?: {
      current_time_in_timezone: string
      days: Array<{
        date_in_timezone: string
        timeslots: Timeslot[]
      }>
      warehouse_timezone: string
    }
    requested_date_from: string
    requested_date_to: string
  } | null
}

export interface CreateSupplyFromDraftV2Request {
  selected_cluster_warehouses: SelectedClusterWarehouse[]
  timeslot: Timeslot
}

export interface CreateSupplyFromDraftV2Response {
  error_reasons?: string[] | null
  order_id?: number | null
  status: string
}

// V2 API interfaces
export interface SupplyCreateStatusV2Request {
  draft_id: number
}

export interface SupplyCreateStatusV2Response {
  error_reasons?: string[] | null
  order_id?: number | null
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
    config: CreateSnapshotConfig,
    supply_data_file?: File
  ): Promise<CreateSnapshotResponse> => {
    if (!config?.drop_off_warehouse) {
      throw new Error('drop_off_warehouse is required')
    }
    
    const formData = new FormData()
    
    // Send config as a single JSON object
    formData.append('config', JSON.stringify(config))
    
    // Add file if provided
    if (supply_data_file) {
      formData.append('supply_data_file', supply_data_file)
    }
    
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
  },

  refreshSnapshot: async (
    snapshotId: number,
    config?: RefreshSnapshotConfig
  ): Promise<RefreshSnapshotResponse> => {
    if (!config?.drop_off_warehouse) {
      throw new Error('drop_off_warehouse is required')
    }
    
    const response = await api.post(
      `/supplies/snapshot/${snapshotId}/refresh`,
      config
    )
    return response.data
  },

  getSnapshotProgress: (snapshotId: number, taskId: string): EventSource => {
    const baseURL = api.defaults.baseURL || ''
    const url = `${baseURL}/supplies/snapshot/${snapshotId}/progress?task_id=${encodeURIComponent(taskId)}`
    
    // EventSource doesn't support custom headers, so we need to use a custom implementation
    // that supports Authorization header via fetch API
    const token = localStorage.getItem('access_token')
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    
    // Create a custom EventSource-like object using fetch
    const eventTarget = new EventTarget()
    let abortController: AbortController | null = null
    
    const startStream = () => {
      abortController = new AbortController()
      
      fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          
          if (!reader) {
            throw new Error('No response body')
          }
          
          let buffer = ''
          let currentEventType = 'progress'
          let currentData: string[] = []
          
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              break
            }
            
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            
            for (const line of lines) {
              if (line.startsWith('event:')) {
                currentEventType = line.substring(6).trim()
              } else if (line.startsWith('data:')) {
                currentData.push(line.substring(5))
              } else if (line === '') {
                // Empty line indicates end of event
                if (currentData.length > 0) {
                  try {
                    const dataString = currentData.join('')
                    // Pass the JSON string as data, ProgressModal will parse it
                    const event = new MessageEvent(currentEventType, { data: dataString })
                    eventTarget.dispatchEvent(event)
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', currentData.join(''))
                  }
                }
                currentEventType = 'progress'
                currentData = []
              }
            }
          }
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            const errorEvent = new MessageEvent('error', {
              data: { error: error.message },
            })
            eventTarget.dispatchEvent(errorEvent)
          }
        })
    }
    
    startStream()
    
    // Create EventSource-like interface
    const eventSource = {
      addEventListener: (type: string, listener: EventListener) => {
        eventTarget.addEventListener(type, listener)
      },
      removeEventListener: (type: string, listener: EventListener) => {
        eventTarget.removeEventListener(type, listener)
      },
      close: () => {
        if (abortController) {
          abortController.abort()
        }
      },
      readyState: EventSource.CONNECTING,
      url: fullUrl,
      withCredentials: true,
    } as EventSource
    
    return eventSource
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

  // V2 API methods
  createCrossdockDraft: async (
    request: CreateCrossdockDraftRequest
  ): Promise<SupplyDraft> => {
    const response = await api.post('/supplies/v2/supply-draft', request)
    return response.data
  },

  getDraftInfoV2: async (draftId: number): Promise<SupplyDraft> => {
    const response = await api.get(`/supplies/v2/supply-draft/${draftId}`)
    return response.data
  },

  deleteSupplyDraft: async (draftId: number): Promise<void> => {
    await api.delete(`/supplies/supply-draft/${draftId}`)
  },

  getSnapshotDrafts: async (
    snapshotId: number
  ): Promise<SupplyDraftListResponse> => {
    const response = await api.get(`/supplies/snapshot/${snapshotId}/drafts`)
    return response.data
  },

  getDraftTimeslotsV2: async (
    draftId: number,
    request: DraftTimeslotRequestV2
  ): Promise<DraftTimeslotResponseV2> => {
    const response = await api.post(
      `/supplies/v2/supply-draft/${draftId}/timeslots`,
      request
    )
    return response.data
  },

  createSupplyFromDraftV2: async (
    draftId: number,
    request: CreateSupplyFromDraftV2Request
  ): Promise<CreateSupplyFromDraftV2Response> => {
    const response = await api.post(
      `/supplies/v2/supply-draft/${draftId}/create-supply`,
      request
    )
    return response.data
  },

  getSupplyCreateStatusV2: async (
    draftId: number,
    request: SupplyCreateStatusV2Request
  ): Promise<SupplyCreateStatusV2Response> => {
    const response = await api.post(
      `/supplies/v2/supply-draft/${draftId}/status`,
      request
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
  data: SupplyDataItem[]
): Promise<SupplySnapshotResponse> {
  const response = await api.put<SupplySnapshotResponse>(
    `/supplies/snapshot/${snapshotId}`,
    { data }
  )
  return response.data
}

