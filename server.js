// SSR server: renders public landing pages on the server, serves the CRM as a client-only SPA.
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import express from 'express'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 3001)
const root = path.dirname(fileURLToPath(import.meta.url))

// Public origin for canonical/sitemap URLs; derived from the request when unset
const siteUrlFromEnv = process.env.SITE_URL?.replace(/\/$/, '')
// API base reachable from this container, e.g. http://web:8000/markets/api/v1
const apiBaseUrl = process.env.SSR_API_BASE_URL

const app = express()
const server = http.createServer(app)
app.set('trust proxy', true)
app.disable('x-powered-by')

let vite
let template
let entry

if (isProduction) {
  app.use(compression())
  template = await fs.readFile(path.join(root, 'dist/client/index.html'), 'utf-8')
  entry = await import('./dist/server/entry-server.js')
  app.use(
    '/assets',
    express.static(path.join(root, 'dist/client/assets'), { immutable: true, maxAge: '1y', index: false }),
  )
  // The raw template must only be served through the renderer
  app.get('/index.html', (_req, res) => res.redirect(301, '/'))
  app.use(express.static(path.join(root, 'dist/client'), { index: false }))
} else {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: 'custom',
  })
  app.use(vite.middlewares)
}

const loadEntry = async (url) => {
  if (isProduction) {
    return { template, entry }
  }
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf-8')
  return {
    template: await vite.transformIndexHtml(url, html),
    entry: await vite.ssrLoadModule('/src/entry-server.tsx'),
  }
}

const getSiteUrl = (req) => siteUrlFromEnv || `${req.protocol}://${req.get('host')}`

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', '', `Sitemap: ${getSiteUrl(req)}/sitemap.xml`, ''].join('\n'),
  )
})

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const { entry } = await loadEntry(req.originalUrl)
    const xml = await entry.renderSitemap({ siteUrl: getSiteUrl(req), apiBaseUrl })
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml)
  } catch (error) {
    next(error)
  }
})

app.use(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end()
    return
  }

  const url = req.originalUrl
  try {
    const { template, entry } = await loadEntry(url)
    const rendered = await entry.render(url, { siteUrl: getSiteUrl(req), apiBaseUrl })
    const html = template
      .replace('<!--app-head-->', rendered.head)
      .replace('<!--app-html-->', rendered.html)
      .replace('<!--app-data-->', rendered.data)
    res.status(rendered.status).set({ 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }).send(html)
  } catch (error) {
    vite?.ssrFixStacktrace(error)
    console.error(`SSR failed for ${url}:`, error)
    // Fall back to client-side rendering rather than failing the page
    const html = (isProduction ? template : await fs.readFile(path.join(root, 'index.html'), 'utf-8'))
      .replace('<!--app-head-->', '<title>Market CRM</title>')
      .replace('<!--app-html-->', '')
      .replace('<!--app-data-->', '')
    res.status(500).set({ 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }).send(html)
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`)
})
