import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'
import { chestnyZnakApi, czErrorMessage, type CzAuthStatus } from '../../api/chestnyZnak'

const THUMBPRINT_KEY = 'crm.cz.certThumbprint'

export function getSavedThumbprint(): string | null {
  try {
    return localStorage.getItem(THUMBPRINT_KEY)
  } catch {
    return null
  }
}

export function saveThumbprint(thumbprint: string): void {
  try {
    localStorage.setItem(THUMBPRINT_KEY, thumbprint)
  } catch {
    // Storage unavailable: the user picks the certificate again next time
  }
}

const UNSIGNED_SANDBOX_KEY = 'crm.cz.sandboxUnsigned'

/** Sandbox testing without a certificate: send payloads with an empty signature. */
export function getSandboxUnsigned(): boolean {
  try {
    return localStorage.getItem(UNSIGNED_SANDBOX_KEY) === '1'
  } catch {
    return false
  }
}

export function setSandboxUnsigned(value: boolean): void {
  try {
    if (value) localStorage.setItem(UNSIGNED_SANDBOX_KEY, '1')
    else localStorage.removeItem(UNSIGNED_SANDBOX_KEY)
  } catch {
    // Storage unavailable: the switch resets on reload
  }
}

export function useCzAuthStatus(connectionId: number) {
  const [status, setStatus] = useState<CzAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await chestnyZnakApi.getAuthStatus(connectionId))
    } catch (error) {
      message.error(await czErrorMessage(error, 'Ошибка проверки входа в Честный знак'))
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => {
    let cancelled = false
    chestnyZnakApi
      .getAuthStatus(connectionId)
      .then((s) => {
        if (!cancelled) setStatus(s)
      })
      .catch(async (error) => {
        if (!cancelled) {
          message.error(await czErrorMessage(error, 'Ошибка проверки входа в Честный знак'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [connectionId])

  return { status, setStatus, loading, reload }
}
