import api from './axios'
import type { DataSource } from './dataSources'

export interface Connection {
  id: number
  company_id: number
  data_source_id: number
  credentials: Record<string, any>
  data_source?: DataSource | null
  created_at: string
  updated_at: string
}

export interface ConnectionCreate {
  company_id: number
  data_source_id: number
  credentials: Record<string, any>
}

export interface ConnectionUpdate {
  data_source_id?: number
  credentials?: Record<string, any>
}

export const connectionsApi = {
  getAll: async (): Promise<Connection[]> => {
    const response = await api.get('/connections/')
    return response.data
  },

  getById: async (id: number): Promise<Connection> => {
    const response = await api.get(`/connections/${id}`)
    return response.data
  },

  getByCompanyId: async (companyId: number): Promise<Connection[]> => {
    const allConnections = await connectionsApi.getAll()
    return allConnections.filter((conn) => conn.company_id === companyId)
  },

  create: async (data: ConnectionCreate): Promise<Connection> => {
    const response = await api.post('/connections/', data)
    return response.data
  },

  update: async (id: number, data: ConnectionUpdate): Promise<Connection> => {
    const response = await api.put(`/connections/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/connections/${id}`)
  },
}

