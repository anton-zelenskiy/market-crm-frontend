import { createContext, useContext, useEffect } from 'react'

export const SITE_NAME = 'Market CRM'

export interface PageMeta {
  title: string
  description?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>
}

export const DEFAULT_META: PageMeta = { title: SITE_NAME, noindex: true }

type MetaCollector = (meta: PageMeta) => void

const PageMetaContext = createContext<MetaCollector | null>(null)

/** Server-only: receives the meta of the rendered page so it can be put into <head>. */
export const PageMetaCollector = PageMetaContext.Provider

const setMetaTag = (name: string, content: string | undefined) => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!content) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
    document.head.appendChild(tag)
  }
  tag.content = content
}

/**
 * Declares page title/description. On the server the meta is collected during render and
 * written into <head>; on the client it is applied on mount (client-side navigation).
 */
export const usePageMeta = (meta: PageMeta) => {
  const collect = useContext(PageMetaContext)
  collect?.(meta)

  const { title, description, noindex } = meta
  useEffect(() => {
    document.title = title
    setMetaTag('description', description)
    setMetaTag('robots', noindex ? 'noindex, nofollow' : undefined)
  }, [title, description, noindex])
}
