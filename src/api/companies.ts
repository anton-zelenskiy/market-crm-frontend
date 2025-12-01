import api from './axios'
import type { DataSource } from './dataSources'

export interface Company {
  id: number
  name: string
  slug: string | null
  data_source_id: number
  user_id: number
  credentials: Record<string, any>
  data_source?: DataSource | null
  created_at: string
  updated_at: string
}

export interface CompanyCreate {
  name: string
  slug?: string | null
  data_source_id: number
  credentials: Record<string, any>
}

export interface CompanyUpdate {
  name?: string
  slug?: string | null
  data_source_id?: number
  credentials?: Record<string, any>
}

export const companiesApi = {
  getAll: async (): Promise<Company[]> => {
    const response = await api.get('/companies/')
    return response.data
  },

  getById: async (id: number): Promise<Company> => {
    const response = await api.get(`/companies/${id}`)
    return response.data
  },

  create: async (data: CompanyCreate): Promise<Company> => {
    const response = await api.post('/companies/', data)
    return response.data
  },

  update: async (id: number, data: CompanyUpdate): Promise<Company> => {
    const response = await api.put(`/companies/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/companies/${id}`)
  },
}

