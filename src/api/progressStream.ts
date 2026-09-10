import api from './axios'

/**
 * Minimal EventSource-like handle. The native `EventSource` can't send an
 * `Authorization` header, so this is a hand-rolled SSE client over `fetch` +
 * `ReadableStream`.
 */
export interface ProgressEventSource {
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  close: () => void
}

/** Resolve a possibly origin-relative API path to an absolute URL. */
export function resolveApiUrl(path: string): string {
  const baseURL = api.defaults.baseURL || ''
  const url = `${baseURL}${path}`
  return url.startsWith('http') ? url : `${window.location.origin}${url}`
}

/**
 * Open an SSE stream to `url` (absolute or origin-relative) with the current
 * JWT attached. Dispatches `MessageEvent`s named after the SSE `event:` field
 * (`progress` by default), plus:
 *  - `end`   when the server closes the stream without a terminal event
 *  - `error` (data is a JSON string `{status,stage,progress,error,httpStatus}`)
 *    on network failure or a non-OK response.
 * The token is read at call time so a reconnect after rehydration picks up a
 * fresh token.
 */
export function openProgressStream(url: string): ProgressEventSource {
  const fullUrl = url.startsWith('http') ? url : resolveApiUrl(url)
  const token = localStorage.getItem('access_token')

  const eventTarget = new EventTarget()
  const abortController = new AbortController()

  const dispatchError = (message: string, httpStatus: number | null) => {
    eventTarget.dispatchEvent(
      new MessageEvent('error', {
        data: JSON.stringify({
          status: 'error',
          stage: 'error',
          progress: 0,
          error: message,
          httpStatus,
        }),
      })
    )
  }

  fetch(fullUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw Object.assign(new Error(`HTTP ${response.status}`), {
          httpStatus: response.status,
        })
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }
      const decoder = new TextDecoder()

      let buffer = ''
      let currentEventType = 'progress'
      let currentData: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.substring(6).trim()
          } else if (line.startsWith('data:')) {
            currentData.push(line.substring(5))
          } else if (line === '') {
            if (currentData.length > 0) {
              const dataString = currentData.join('')
              eventTarget.dispatchEvent(
                new MessageEvent(currentEventType, { data: dataString })
              )
            }
            currentEventType = 'progress'
            currentData = []
          }
        }
      }

      // Stream ended without a terminal event — let listeners resolve it.
      eventTarget.dispatchEvent(new MessageEvent('end', { data: '' }))
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return
      const httpStatus =
        error && typeof error === 'object' && 'httpStatus' in error
          ? ((error as { httpStatus?: number }).httpStatus ?? null)
          : null
      const message = error instanceof Error ? error.message : String(error)
      dispatchError(message, httpStatus)
    })

  return {
    addEventListener: (type, listener) =>
      eventTarget.addEventListener(type, listener),
    removeEventListener: (type, listener) =>
      eventTarget.removeEventListener(type, listener),
    close: () => abortController.abort(),
  }
}
