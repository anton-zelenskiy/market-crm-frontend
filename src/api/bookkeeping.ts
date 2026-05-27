import api from './axios'

export interface FinanceBank {
  id: number
  code: string
  name: string
}

export interface FinanceBookkeepingArticleCatalog {
  id: number
  name: string
  flow_group: string
  activity_type: string
  sub_article: string | null
  source_hint: string | null
  requires_platform: boolean
  sort_order: number
  is_active: boolean
}

export interface FinanceOperation {
  id: number
  connection_id: number
  import_batch_id: number | null
  wallet_id: number | null
  bank_id: number
  bank_code: string | null
  bookkeeping_article_id: number | null
  bookkeeping_article_name: string | null
  wallet_name: string
  source: string
  source_file_name: string | null
  operation_date: string
  amount: string
  operation_type: 'debit' | 'credit'
  payment_details: string
  contractor: string | null
  platform: string | null
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
  wallet_id?: number | null
  bank_id?: number | null
  operation_date: string
  amount: number
  operation_type: 'debit' | 'credit'
  payment_details?: string
  bookkeeping_article_id?: number | null
  contractor?: string | null
  platform?: string | null
}

export interface FinanceOperationUpdate {
  wallet_id?: number | null
  bank_id?: number | null
  operation_date?: string
  amount?: number
  operation_type?: 'debit' | 'credit'
  payment_details?: string
  bookkeeping_article_id?: number | null
  contractor?: string | null
  platform?: string | null
}

export interface FinanceWalletOpeningBalance {
  id: number
  wallet_id: number
  effective_from: string
  amount: string
}

export interface FinanceWallet {
  id: number
  connection_id: number
  name: string
  bank_id: number | null
  bank_code: string | null
  bank_display_name: string | null
  sort_order: number
  is_active: boolean
  opening_balances: FinanceWalletOpeningBalance[]
}

export interface FinanceWalletCreate {
  name: string
  bank_id?: number | null
  sort_order?: number
  is_active?: boolean
}

export interface FinanceWalletUpdate {
  name?: string
  bank_id?: number | null
  sort_order?: number
  is_active?: boolean
}

export interface FinanceWalletOpeningBalanceUpsert {
  effective_from: string
  amount: number
}

export interface FinanceBookkeepingArticle {
  id: number
  connection_id: number
  catalog_article_id: number | null
  name: string
  flow_group: string
  activity_type: string
  sub_article: string | null
  source_hint: string | null
  requires_platform: boolean
  sort_order: number
  is_active: boolean
}

export interface FinanceBookkeepingArticleCreate {
  name: string
  flow_group: string
  activity_type: string
  sub_article?: string | null
  source_hint?: string | null
  requires_platform?: boolean
  sort_order?: number
  is_active?: boolean
}

export interface FinanceBookkeepingArticleUpdate {
  name?: string
  flow_group?: string
  activity_type?: string
  sub_article?: string | null
  source_hint?: string | null
  requires_platform?: boolean
  sort_order?: number
  is_active?: boolean
}

export interface ListOperationsParams {
  date_from?: string
  date_to?: string
  amount_exact?: number
  amount_min?: number
  amount_max?: number
  bank_code?: string
  bank_id?: number
  wallet_id?: number
  source_file_name?: string
  search?: string
  limit?: number
  offset?: number
}

export interface BulkDeleteResponse {
  deleted: number
}

export const bookkeepingApi = {
  listBanks: async (): Promise<FinanceBank[]> => {
    const response = await api.get('/finances/bookkeeping/banks')
    return response.data
  },

  listCatalogArticles: async (): Promise<FinanceBookkeepingArticleCatalog[]> => {
    const response = await api.get('/finances/bookkeeping/catalog-articles')
    return response.data
  },

  listOperations: async (
    connectionId: number,
    params?: ListOperationsParams
  ): Promise<FinanceOperationListResponse> => {
    const response = await api.get(`/finances/bookkeeping/${connectionId}/operations`, {
      params,
    })
    return response.data
  },

  listSourceFileNames: async (connectionId: number): Promise<string[]> => {
    const response = await api.get(
      `/finances/bookkeeping/${connectionId}/operations/source-file-names`
    )
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

  importArticlesFromCatalog: async (
    connectionId: number
  ): Promise<Record<string, number>> => {
    const response = await api.post(
      `/finances/bookkeeping/${connectionId}/import-articles-from-catalog`
    )
    return response.data
  },

  listWallets: async (connectionId: number): Promise<FinanceWallet[]> => {
    const response = await api.get(`/finances/bookkeeping/${connectionId}/wallets`)
    return response.data
  },

  createWallet: async (
    connectionId: number,
    body: FinanceWalletCreate
  ): Promise<FinanceWallet> => {
    const response = await api.post(`/finances/bookkeeping/${connectionId}/wallets`, body)
    return response.data
  },

  updateWallet: async (
    connectionId: number,
    walletId: number,
    body: FinanceWalletUpdate
  ): Promise<FinanceWallet> => {
    const response = await api.patch(
      `/finances/bookkeeping/${connectionId}/wallets/${walletId}`,
      body
    )
    return response.data
  },

  deleteWallet: async (connectionId: number, walletId: number): Promise<void> => {
    await api.delete(`/finances/bookkeeping/${connectionId}/wallets/${walletId}`)
  },

  upsertOpeningBalance: async (
    connectionId: number,
    walletId: number,
    body: FinanceWalletOpeningBalanceUpsert
  ): Promise<FinanceWallet> => {
    const response = await api.put(
      `/finances/bookkeeping/${connectionId}/wallets/${walletId}/opening-balance`,
      body
    )
    return response.data
  },

  listBookkeepingArticles: async (
    connectionId: number
  ): Promise<FinanceBookkeepingArticle[]> => {
    const response = await api.get(
      `/finances/bookkeeping/${connectionId}/bookkeeping-articles`
    )
    return response.data
  },

  createBookkeepingArticle: async (
    connectionId: number,
    body: FinanceBookkeepingArticleCreate
  ): Promise<FinanceBookkeepingArticle> => {
    const response = await api.post(
      `/finances/bookkeeping/${connectionId}/bookkeeping-articles`,
      body
    )
    return response.data
  },

  updateBookkeepingArticle: async (
    connectionId: number,
    articleId: number,
    body: FinanceBookkeepingArticleUpdate
  ): Promise<FinanceBookkeepingArticle> => {
    const response = await api.patch(
      `/finances/bookkeeping/${connectionId}/bookkeeping-articles/${articleId}`,
      body
    )
    return response.data
  },

  deleteBookkeepingArticle: async (
    connectionId: number,
    articleId: number
  ): Promise<void> => {
    await api.delete(
      `/finances/bookkeeping/${connectionId}/bookkeeping-articles/${articleId}`
    )
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

  bulkDeleteOperations: async (
    connectionId: number,
    options: { ids?: number[]; filters?: ListOperationsParams }
  ): Promise<BulkDeleteResponse> => {
    const response = await api.post(
      `/finances/bookkeeping/${connectionId}/operations/bulk-delete`,
      options.ids?.length ? { ids: options.ids } : {},
      { params: options.filters }
    )
    return response.data
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
