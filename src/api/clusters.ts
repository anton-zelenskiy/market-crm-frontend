import api from './axios'

export interface OzonCluster {
  id: number
  cluster_id: number
  name: string
  macrolocal_cluster_id: number | null
  neighbor_cluster_id: number | null
  priority: number
  is_available: boolean
}

export interface OzonClusterUpdate {
  neighbor_cluster_id?: number | null
  priority?: number
  is_available?: boolean
}

export const ozonClustersApi = {
  getAll: async (): Promise<OzonCluster[]> => {
    const response = await api.get('/clusters/ozon/')
    return response.data
  },

  update: async (id: number, data: OzonClusterUpdate): Promise<OzonCluster> => {
    const response = await api.patch(`/clusters/ozon/${id}`, data)
    return response.data
  },

  syncFromAPI: async (): Promise<{ message: string }> => {
    const response = await api.post('/clusters/ozon/sync')
    return response.data
  },
}
