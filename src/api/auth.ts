import api from './axios'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>('/auth/login', data)
  return response.data
}

export const register = async (data: RegisterRequest): Promise<void> => {
  await api.post('/auth/register', data)
}
