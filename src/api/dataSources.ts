import api from './axios'

export interface CredentialFieldDefinition {
  name: string
  label: string
  type: string
  required?: boolean
  description?: string | null
}

export interface DataSource {
  id: number
  title: string
  name: 'ozon' | 'wildberries'
  credential_fields: CredentialFieldDefinition[]
  created_at: string
  updated_at: string
}

export interface DataSourceCreate {
  title: string
  name: 'ozon' | 'wildberries'
  credential_fields: CredentialFieldDefinition[]
}

export interface DataSourceUpdate {
  title?: string
  name?: 'ozon' | 'wildberries'
  credential_fields?: CredentialFieldDefinition[]
}

export const dataSourcesApi = {
  getAll: async (): Promise<DataSource[]> => {
    const response = await api.get('/data-sources/')
    return response.data
  },

  getById: async (id: number): Promise<DataSource> => {
    const response = await api.get(`/data-sources/${id}`)
    return response.data
  },

  create: async (data: DataSourceCreate): Promise<DataSource> => {
    const response = await api.post('/data-sources/', data)
    return response.data
  },

  update: async (id: number, data: DataSourceUpdate): Promise<DataSource> => {
    const response = await api.put(`/data-sources/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/data-sources/${id}`)
  },
}

