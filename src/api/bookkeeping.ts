import api from './axios'

export interface FinanceOperation {
  id: number
  connection_id: number
  import_batch_id: number | null
  source: string
  bank_name: string
  source_file_name: string | null
  operation_date: string
  amount: string
  operation_type: 'debit' | 'credit'
  payment_details: string
}

export interface FinanceOperationListResponse {
  items: FinanceOperation[]
  total: number
}

export interface FinanceImportBatch {
  id: number
  connection_id: number
  status: string
  uploaded_files: Record<string, unknown>[] | null
  operations_count: number
  error_message: string | null
  is_manual_sink: boolean
}

export interface ImportUploadResponse {
  batch: FinanceImportBatch
  files: Record<string, unknown>[]
}

export interface FinanceOperationCreate {
  bank_name: string
  operation_date: string
  amount: number
  operation_type: 'debit' | 'credit'
  payment_details?: string
}

export interface FinanceOperationUpdate {
  bank_name?: string
  operation_date?: string
  amount?: number
  operation_type?: 'debit' | 'credit'
  payment_details?: string
}

export interface ListOperationsParams {
  date_from?: string
  date_to?: string
  amount_exact?: number
  amount_min?: number
  amount_max?: number
  bank_name?: string
  search?: string
  limit?: number
  offset?: number
}

export const bookkeepingApi = {
  listOperations: async (
    connectionId: number,
    params?: ListOperationsParams
  ): Promise<FinanceOperationListResponse> => {
    const response = await api.get(`/finances/bookkeeping/${connectionId}/operations`, {
      params,
    })
    return response.data
  },

  uploadImports: async (
    connectionId: number,
    files: File[]
  ): Promise<ImportUploadResponse> => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    const response = await api.post(
      `/finances/bookkeeping/${connectionId}/imports/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return response.data
  },

  createOperation: async (
    connectionId: number,
    body: FinanceOperationCreate
  ): Promise<FinanceOperation> => {
    const response = await api.post(`/finances/bookkeeping/${connectionId}/operations`, body)
    return response.data
  },

  updateOperation: async (
    connectionId: number,
    operationId: number,
    body: FinanceOperationUpdate
  ): Promise<FinanceOperation> => {
    const response = await api.patch(
      `/finances/bookkeeping/${connectionId}/operations/${operationId}`,
      body
    )
    return response.data
  },

  deleteOperation: async (connectionId: number, operationId: number): Promise<void> => {
    await api.delete(`/finances/bookkeeping/${connectionId}/operations/${operationId}`)
  },

  exportXlsx: async (
    connectionId: number,
    params?: ListOperationsParams & { include_pairs_preview?: boolean }
  ): Promise<Blob> => {
    const response = await api.get(`/finances/bookkeeping/${connectionId}/export.xlsx`, {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
