import api from './axios'

export interface WbAuthInitiateResponse {
  status: 'already_authorized' | 'code_sent'
  session_id: string | null
  message: string
}

export interface WbAuthConfirmResponse {
  success: boolean
  message: string
}

export const wbAuthApi = {
  initiate: async (
    connectionId: number,
    phone: string,
  ): Promise<WbAuthInitiateResponse> => {
    const response = await api.post(
      `/wildberries/connections/${connectionId}/auth/initiate`,
      { phone },
    )
    return response.data
  },

  confirm: async (
    connectionId: number,
    sessionId: string,
    code: string,
  ): Promise<WbAuthConfirmResponse> => {
    const response = await api.post(
      `/wildberries/connections/${connectionId}/auth/confirm`,
      { session_id: sessionId, code },
    )
    return response.data
  },
}
