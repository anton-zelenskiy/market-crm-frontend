import api from './axios'

export interface ConnectionSettings {
  id: number
  connection_id: number
  logistics_distance: number
}

export interface ConnectionSettingsUpdate {
  logistics_distance?: number
}

export const connectionSettingsApi = {
  getByConnectionId: async (connectionId: number): Promise<ConnectionSettings> => {
    const response = await api.get(`/connections/${connectionId}/settings/`)
    return response.data
  },

  update: async (
    connectionId: number,
    data: ConnectionSettingsUpdate
  ): Promise<ConnectionSettings> => {
    const response = await api.put(`/connections/${connectionId}/settings/`, data)
    return response.data
  },
}
