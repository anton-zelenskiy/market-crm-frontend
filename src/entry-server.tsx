import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter, matchPath } from 'react-router-dom'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import { isAxiosError } from 'axios'
import App from './App'
import api from './api/axios'
import { subscriptionsApi } from './api/subscriptions'
import { InitialDataProvider, type InitialData } from './ssr/InitialData'
import { DEFAULT_META, PageMetaCollector, SITE_NAME, type PageMeta } from './ssr/PageMeta'
import { SITEMAP_ROUTES, isSsrPath } from './ssr/routes'

export interface RenderOptions {
  /** Absolute site origin, e.g. https://example.com — used for canonical/OG URLs. */
  siteUrl: string
  /** API base URL reachable from the server (internal network); falls back to VITE_API_BASE_URL. */
  apiBaseUrl?: string
}

export interface RenderResult {
  status: number
  head: string
  html: string
  data: string
}

const API_TIMEOUT_MS = 5000

const configureApi = (apiBaseUrl?: string) => {
  if (apiBaseUrl) {
    api.defaults.baseURL = apiBaseUrl
  }
  api.defaults.timeout = API_TIMEOUT_MS
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// JSON inside <script> must not be able to close the tag
const serializeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

/** Fetches the data a public page needs; a failed fetch leaves it to the client. */
const loadData = async (pathname: string): Promise<{ data: InitialData; status: number }> => {
  try {
    if (matchPath('/tariffs', pathname)) {
      return { data: { tariffs: await subscriptionsApi.getTariffs() }, status: 200 }
    }

    const tariffMatch = matchPath('/tariff/:slug', pathname)
    if (tariffMatch?.params.slug) {
      const slug = tariffMatch.params.slug
      try {
        return { data: { tariff: { slug, data: await subscriptionsApi.getTariffBySlug(slug) } }, status: 200 }
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return { data: { tariff: { slug, data: null } }, status: 404 }
        }
        throw error
      }
    }
  } catch (error) {
    console.error(`SSR data fetch failed for ${pathname}:`, error instanceof Error ? error.message : error)
  }
  return { data: {}, status: 200 }
}

const renderHead = (meta: PageMeta, canonicalUrl: string) => {
  const title = escapeHtml(meta.title)
  const tags = [`<title>${title}</title>`]

  if (meta.noindex) {
    tags.push('<meta name="robots" content="noindex, nofollow" />')
  } else {
    tags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`)
  }

  if (meta.description) {
    const description = escapeHtml(meta.description)
    tags.push(
      `<meta name="description" content="${description}" />`,
      `<meta property="og:description" content="${description}" />`,
    )
  }

  tags.push(
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="ru_RU" />',
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    '<meta name="twitter:card" content="summary" />',
  )

  if (meta.jsonLd) {
    tags.push(`<script type="application/ld+json">${serializeJson(meta.jsonLd)}</script>`)
  }

  return tags.join('\n    ')
}

export async function render(url: string, options: RenderOptions): Promise<RenderResult> {
  configureApi(options.apiBaseUrl)

  const { pathname } = new URL(url, options.siteUrl)
  const canonicalUrl = `${options.siteUrl}${pathname}`

  // CRM pages are rendered in the browser only
  if (!isSsrPath(pathname)) {
    return { status: 200, head: renderHead(DEFAULT_META, canonicalUrl), html: '', data: '' }
  }

  const { data, status } = await loadData(pathname)
  let meta = DEFAULT_META
  const styleCache = createCache()

  const html = renderToString(
    <StrictMode>
      <StyleProvider cache={styleCache}>
        <PageMetaCollector value={(pageMeta) => (meta = pageMeta)}>
          <InitialDataProvider value={data}>
            <StaticRouter location={url}>
              <App />
            </StaticRouter>
          </InitialDataProvider>
        </PageMetaCollector>
      </StyleProvider>
    </StrictMode>,
  )

  return {
    status,
    head: `${renderHead(meta, canonicalUrl)}\n    ${extractStyle(styleCache)}`,
    html,
    data: `<script>window.__INITIAL_DATA__=${serializeJson(data)}</script>`,
  }
}

export async function renderSitemap(options: RenderOptions): Promise<string> {
  configureApi(options.apiBaseUrl)

  const paths = [...SITEMAP_ROUTES]
  try {
    const tariffs = await subscriptionsApi.getTariffs()
    paths.push(...tariffs.map((tariff) => `/tariff/${tariff.slug}`))
  } catch (error) {
    console.error('Sitemap tariff fetch failed:', error instanceof Error ? error.message : error)
  }

  const urls = paths.map((path) => `  <url><loc>${escapeHtml(`${options.siteUrl}${path}`)}</loc></url>`)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}
