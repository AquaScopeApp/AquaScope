/**
 * Currency Settings Context
 *
 * Provides app-wide access to the default currency.
 * Loaded once on app start, refreshable from Admin page.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { adminApi } from '../api'

interface CurrencyContextValue {
  currency: string
  isLoaded: boolean
  refresh: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'EUR',
  isLoaded: false,
  refresh: async () => {},
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState('EUR')
  const [isLoaded, setIsLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const path = window.location.pathname
    const token = localStorage.getItem('aquascope_token')
    if (!token || path === '/login' || path === '/register') {
      setIsLoaded(true)
      return
    }
    try {
      const data = await adminApi.getGeneralSettings()
      if (data.default_currency) {
        setCurrency(data.default_currency)
      }
    } catch {
      // Keep default
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <CurrencyContext.Provider value={{ currency, isLoaded, refresh }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
