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

export interface RegisteredUser {
  id: number
  email: string | null
  is_verified: boolean
}

export interface MessageResponse {
  message: string
}

// Login error detail for accounts whose email isn't confirmed yet.
export const EMAIL_NOT_VERIFIED = 'email_not_verified'

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

export const completeRegistration = async (
  data: CompleteRegistrationRequest,
): Promise<RegisteredUser> => {
  const response = await api.post<RegisteredUser>('/auth/complete-registration', data)
  return response.data
}

export const verifyEmail = async (token: string): Promise<MessageResponse> => {
  const response = await api.post<MessageResponse>('/auth/verify-email', { token })
  return response.data
}

export const resendVerification = async (email: string): Promise<MessageResponse> => {
  const response = await api.post<MessageResponse>('/auth/resend-verification', { email })
  return response.data
}
