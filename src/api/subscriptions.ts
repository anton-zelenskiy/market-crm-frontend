import api from './axios'

export interface TariffVariant {
  id: number
  tariff_id: number
  period: number
  price: number
}

export interface Tariff {
  id: number
  slug: string
  tariff_type: string
  options: string[]
  variants: TariffVariant[]
}

export interface Subscription {
  id: number
  user_id: number
  tariff_id: number
  tariff_variant_id: number
  start_date: string
  finish_date: string
}

export interface SubscriptionWithDetails extends Subscription {
  tariff: Tariff
  tariff_variant: TariffVariant
}

export const TariffType = {
  DEMO: 'demo',
  STANDARD: 'standard',
  PREMIUM: 'premium',
} as const

export type TariffType = (typeof TariffType)[keyof typeof TariffType]

export const subscriptionsApi = {
  getTariffs: async (): Promise<Tariff[]> => {
    const response = await api.get<Tariff[]>('/tariffs')
    return response.data
  },

  getTariffBySlug: async (slug: string): Promise<Tariff> => {
    const response = await api.get<Tariff>(`/tariffs/${slug}`)
    return response.data
  },

  getSubscriptions: async (): Promise<Subscription[]> => {
    const response = await api.get<Subscription[]>('/subscriptions')
    return response.data
  },

  getSubscription: async (id: number): Promise<SubscriptionWithDetails> => {
    const response = await api.get<SubscriptionWithDetails>(`/subscriptions/${id}`)
    return response.data
  },
}
