import api from './axios'

export interface KaitenIntegrationCredentialsPublic {
  domain: string
  token_configured: boolean
}

export interface KaitenIntegrationSettings {
  space_id?: number | null
  board_id: number
  lane_id: number
  column_id: number
  owner_id?: number | null
  card_title_suffix?: string
}

export interface KaitenIntegrationResponse {
  enabled: boolean
  credentials: KaitenIntegrationCredentialsPublic
  settings: KaitenIntegrationSettings | null
  settings_configured?: boolean
}

export interface KaitenIntegrationUpsert {
  enabled: boolean
  credentials?: { domain: string; token: string } | null
  settings?: KaitenIntegrationSettings | null
}

export interface KaitenSelectOption {
  id: number
  title: string | null
}

export interface KaitenUserOption {
  id: number
  full_name: string | null
  email: string | null
  username: string | null
}

export interface KaitenUsersListResponse {
  users: KaitenUserOption[]
  limit: number
  offset: number
  has_more: boolean
}

export interface KaitenCardActionResponse {
  card_id: number
  card_url: string
}

export const kaitenIntegrationApi = {
  get: async (connectionId: number): Promise<KaitenIntegrationResponse> => {
    const response = await api.get(`/connections/${connectionId}/integrations/kaiten/`)
    return response.data
  },

  upsert: async (
    connectionId: number,
    data: KaitenIntegrationUpsert
  ): Promise<KaitenIntegrationResponse> => {
    const response = await api.put(`/connections/${connectionId}/integrations/kaiten/`, data)
    return response.data
  },

  delete: async (connectionId: number): Promise<void> => {
    await api.delete(`/connections/${connectionId}/integrations/kaiten/`)
  },

  listSpaces: async (connectionId: number): Promise<KaitenSelectOption[]> => {
    const response = await api.get(`/connections/${connectionId}/integrations/kaiten/spaces`)
    return response.data
  },

  listBoards: async (
    connectionId: number,
    spaceId: number
  ): Promise<KaitenSelectOption[]> => {
    const response = await api.get(
      `/connections/${connectionId}/integrations/kaiten/spaces/${spaceId}/boards`
    )
    return response.data
  },

  listLanes: async (
    connectionId: number,
    boardId: number
  ): Promise<KaitenSelectOption[]> => {
    const response = await api.get(
      `/connections/${connectionId}/integrations/kaiten/boards/${boardId}/lanes`
    )
    return response.data
  },

  listColumns: async (
    connectionId: number,
    boardId: number
  ): Promise<KaitenSelectOption[]> => {
    const response = await api.get(
      `/connections/${connectionId}/integrations/kaiten/boards/${boardId}/columns`
    )
    return response.data
  },

  listUsers: async (
    connectionId: number,
    params?: { limit?: number; offset?: number; query?: string }
  ): Promise<KaitenUsersListResponse> => {
    const response = await api.get(
      `/connections/${connectionId}/integrations/kaiten/users`,
      { params }
    )
    return response.data
  },
}
