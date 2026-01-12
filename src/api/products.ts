import api from './axios'

// Vendor Products Types
export interface VendorProduct {
  id: number
  company_id: number
  offer_id: string
  name: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface VendorProductCreate {
  offer_id: string
  name: string
  quantity: number
}

export interface VendorProductUpdate {
  offer_id?: string
  name?: string
  quantity?: number
}

// Ozon Products Types
export interface OzonProduct {
  id: number
  connection_id: number
  product_id: number | null
  sku: number
  offer_id: string
  name: string
  barcodes: string[]
  box_quantity: number | null
  vendor_offer_id: string | null
  created_at: string
  updated_at: string
}

export interface OzonProductCreate {
  product_id?: number | null
  sku: number
  offer_id: string
  name: string
  barcodes: string[]
  box_quantity?: number | null
  vendor_offer_id?: string | null
}

export interface OzonProductUpdate {
  product_id?: number
  sku?: number
  offer_id?: string
  name?: string
  barcodes?: string[]
  box_quantity?: number | null
  vendor_offer_id?: string | null
}

// Vendor Products API
export const vendorProductsApi = {
  getAll: async (companyId: number): Promise<VendorProduct[]> => {
    const response = await api.get(`/products/vendor/${companyId}`)
    return response.data
  },

  getById: async (companyId: number, vendorProductId: number): Promise<VendorProduct> => {
    const response = await api.get(`/products/vendor/${companyId}/${vendorProductId}`)
    return response.data
  },

  create: async (companyId: number, data: VendorProductCreate): Promise<VendorProduct> => {
    const response = await api.post(`/products/vendor/${companyId}`, data)
    return response.data
  },

  update: async (
    companyId: number,
    vendorProductId: number,
    data: VendorProductUpdate
  ): Promise<VendorProduct> => {
    const response = await api.put(`/products/vendor/${companyId}/${vendorProductId}`, data)
    return response.data
  },

  delete: async (companyId: number, vendorProductId: number): Promise<void> => {
    await api.delete(`/products/vendor/${companyId}/${vendorProductId}`)
  },

  syncFromCSV: async (companyId: number, file: File): Promise<{ message: string; products_synced: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/products/vendor/${companyId}/sync-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  downloadSyncCSVTemplate: async (companyId: number): Promise<void> => {
    const response = await api.get(`/products/vendor/${companyId}/sync-csv-template`, {
      responseType: 'blob',
    })

    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'vendor_sync_template.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

// Ozon Products API
export const ozonProductsApi = {
  getAll: async (connectionId: number): Promise<OzonProduct[]> => {
    const response = await api.get(`/products/ozon/${connectionId}`)
    return response.data
  },

  getById: async (connectionId: number, ozonProductId: number): Promise<OzonProduct> => {
    const response = await api.get(`/products/ozon/${connectionId}/${ozonProductId}`)
    return response.data
  },

  create: async (connectionId: number, data: OzonProductCreate): Promise<OzonProduct> => {
    const response = await api.post(`/products/ozon/${connectionId}`, data)
    return response.data
  },

  update: async (
    connectionId: number,
    ozonProductId: number,
    data: OzonProductUpdate
  ): Promise<OzonProduct> => {
    const response = await api.put(`/products/ozon/${connectionId}/${ozonProductId}`, data)
    return response.data
  },

  delete: async (connectionId: number, ozonProductId: number): Promise<void> => {
    await api.delete(`/products/ozon/${connectionId}/${ozonProductId}`)
  },

  syncFromCSV: async (
    connectionId: number,
    file: File
  ): Promise<{ message: string; products_updated: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/products/ozon/${connectionId}/sync-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  syncFromAPI: async (connectionId: number): Promise<{ message: string; result: any }> => {
    const response = await api.post(`/products/ozon/${connectionId}/sync`)
    return response.data
  },

  downloadSyncCSVTemplate: async (connectionId: number): Promise<void> => {
    const response = await api.get(`/products/ozon/${connectionId}/sync-csv-template`, {
      responseType: 'blob',
    })
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'box_quantity_template.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

