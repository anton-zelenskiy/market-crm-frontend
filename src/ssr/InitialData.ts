import { createContext, useContext } from 'react'
import type { Tariff } from '../api/subscriptions'

/** Data fetched on the server before rendering and handed over to the client for hydration. */
export interface InitialData {
  tariffs?: Tariff[]
  tariff?: { slug: string; data: Tariff | null }
}

declare global {
  interface Window {
    __INITIAL_DATA__?: InitialData
  }
}

const InitialDataContext = createContext<InitialData>({})

export const InitialDataProvider = InitialDataContext.Provider

export const useInitialData = () => useContext(InitialDataContext)
