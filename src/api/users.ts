import api from './axios'

export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface TariffVariantResponse {
  id: number
  tariff_id: number
  period: number
  price: number
}

export interface TariffResponse {
  id: number
  slug: string
  tariff_type: string
  options: unknown[]
  variants?: TariffVariantResponse[]
}

export interface SubscriptionWithDetails {
  id: number
  user_id: number
  tariff_id: number
  tariff_variant_id: number
  start_date: string
  finish_date: string
  tariff: TariffResponse
  tariff_variant: TariffVariantResponse
}

export interface UserResponse {
  id: number
  email: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  active_subscription: SubscriptionWithDetails | null
}

export const getCurrentUserInfo = async (): Promise<UserResponse> => {
  const response = await api.get<UserResponse>('/users/me')
  return response.data
}
