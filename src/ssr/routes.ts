import { matchPath } from 'react-router-dom'

/** Public (landing) routes rendered on the server. Everything else is the client-only CRM. */
export const SSR_ROUTES = [
  '/',
  '/tariffs',
  '/tariff/:slug',
  '/login',
  '/register',
  '/verify-email',
  '/complete-registration',
]

/** Public routes listed in sitemap.xml (tariff detail pages are added dynamically). */
export const SITEMAP_ROUTES = ['/', '/tariffs', '/register']

export const isSsrPath = (pathname: string) =>
  SSR_ROUTES.some((pattern) => matchPath(pattern, pathname) !== null)
