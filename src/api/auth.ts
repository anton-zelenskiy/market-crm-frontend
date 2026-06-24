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

export interface ValidateTokenResponse {
  user_id: number
  telegram_user_id: number | null
  email: string | null
}

export interface CompleteRegistrationRequest {
  token: string
  email: string
  password: string
}

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>('/auth/login', data)
  return response.data
}

export const register = async (data: RegisterRequest): Promise<void> => {
  await api.post('/auth/register', data)
}

export const validateRegistrationToken = async (token: string): Promise<ValidateTokenResponse> => {
  const response = await api.get<ValidateTokenResponse>(`/auth/registration-link/validate/${token}`)
  return response.data
}

export const completeRegistration = async (data: CompleteRegistrationRequest): Promise<void> => {
  await api.post('/auth/complete-registration', data)
}
