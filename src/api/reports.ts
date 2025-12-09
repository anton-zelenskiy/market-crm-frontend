import api from './axios'
import type { DataSource } from './dataSources'

export type ReportType = 'ozon_stocks' | 'ozon_transit_stocks' | 'ozon_shipments' | 'ozon_product_volumes' | 'ozon_available_transit_stocks'

export interface Report {
  id: number
  title: string
  name: string
  report_type: string
  data_source_id: number
  data_source?: DataSource | null
  created_at: string
  updated_at: string
}

export interface ReportCreate {
  title: string
  name: string
  report_type: ReportType
  data_source_id: number
}

export interface ReportUpdate {
  title?: string
  name?: string
  report_type?: ReportType
  data_source_id?: number
}

export interface ReportRunRequest {
  company_id: number
  report_type: ReportType
  encoding?: 'cp1251' | 'utf-8' | 'utf-16'
}

export const reportsApi = {
  getAll: async (): Promise<Report[]> => {
    const response = await api.get('/reports/')
    return response.data
  },

  getById: async (id: number): Promise<Report> => {
    const response = await api.get(`/reports/${id}`)
    return response.data
  },

  create: async (data: ReportCreate): Promise<Report> => {
    const response = await api.post('/reports/', data)
    return response.data
  },

  update: async (id: number, data: ReportUpdate): Promise<Report> => {
    const response = await api.put(`/reports/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/reports/${id}`)
  },

  run: async (request: ReportRunRequest): Promise<Blob> => {
    const response = await api.post('/reports/run', request, {
      responseType: 'blob',
    })
    return response.data
  },
}

