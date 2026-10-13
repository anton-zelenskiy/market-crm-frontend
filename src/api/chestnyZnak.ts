import axios from 'axios'
import api from './axios'

export type CzEnvironment = 'sandbox' | 'prod'
export type CzCertificateType = 'CONFORMITY_CERTIFICATE' | 'CONFORMITY_DECLARATION'

export const CZ_ENVIRONMENT_LABELS: Record<CzEnvironment, string> = {
  sandbox: 'Песочница',
  prod: 'Production',
}

export const CZ_CERTIFICATE_TYPE_LABELS: Record<CzCertificateType, string> = {
  CONFORMITY_DECLARATION: 'Декларация о соответствии',
  CONFORMITY_CERTIFICATE: 'Сертификат соответствия',
}

export type CzJobStatus =
  | 'AWAIT_ORDER_SIGNATURE'
  | 'ORDERING'
  | 'CODES_READY'
  | 'AWAIT_UTILISATION_SIGNATURE'
  | 'APPLYING'
  | 'AWAIT_INTRODUCE_SIGNATURE'
  | 'INTRODUCING'
  | 'DONE'
  | 'FAILED'

export const CZ_JOB_STATUS_LABELS: Record<CzJobStatus, string> = {
  AWAIT_ORDER_SIGNATURE: 'Ожидает подписи заказа',
  ORDERING: 'Заказ кодов в СУЗ',
  CODES_READY: 'Коды получены',
  AWAIT_UTILISATION_SIGNATURE: 'Ожидает подписи отчёта о нанесении',
  APPLYING: 'Нанесение',
  AWAIT_INTRODUCE_SIGNATURE: 'Ожидает подписи ввода в оборот',
  INTRODUCING: 'Ввод в оборот',
  DONE: 'Введены в оборот',
  FAILED: 'Ошибка',
}

export const CZ_SIGNATURE_STATUSES: CzJobStatus[] = [
  'AWAIT_ORDER_SIGNATURE',
  'AWAIT_UTILISATION_SIGNATURE',
  'AWAIT_INTRODUCE_SIGNATURE',
]

export const CZ_POLLED_STATUSES: CzJobStatus[] = ['ORDERING', 'APPLYING', 'INTRODUCING']

export interface CzSettingsFields {
  inn: string
  oms_id: string
  oms_connection: string
}

export interface CzSettingsResponse {
  active_environment: CzEnvironment | null
  environments: Partial<Record<CzEnvironment, CzSettingsFields>>
}

export interface CzAuthKey {
  uuid: string
  data: string
}

export interface CzAuthChallenge {
  environment: CzEnvironment
  inn: string
  true_api: CzAuthKey
  suz: CzAuthKey
}

export interface CzBalance {
  product_group_id: number | null
  balance_rub: number | null
}

export interface CzAuthStatus {
  environment: CzEnvironment | null
  configured: boolean
  authorized: boolean
  expires_at: string | null
  balances: CzBalance[]
  balance_error: string | null
  code_price_rub: number
}

export interface CzProductRow {
  offer_id: string
  name: string | null
  sku: number | null
  gtin: string | null
  /** Name printed on labels (e.g. «Носки мужские»); the Ozon name when empty */
  product_name: string | null
  tnved_code: string | null
  certificate_type: CzCertificateType | null
  certificate_number: string | null
  certificate_date: string | null
}

export type CzProductUpdate = Omit<CzProductRow, 'name' | 'sku'>

export interface CzCertificate {
  type: CzCertificateType
  number: string
  date: string
}

export interface CzJobPreviewItem {
  offer_id: string
  name: string | null
  gtin: string
  quantity: number
  supply_id: string | null
  certificate_type: CzCertificateType | null
  certificate_number: string | null
  certificate_date: string | null
}

export interface CzJobPreview {
  items: CzJobPreviewItem[]
  /** Document shared by all products on the GTIN page, if any */
  certificate: CzCertificate | null
}

export interface CzSupplyRef {
  supply_id: string
  order_id: string
}

export type CzJobCreate =
  | {
      source: 'SUPPLIES'
      supplies: CzSupplyRef[]
      introduce: boolean
      production_date?: string | null
      certificate?: CzCertificate | null
    }
  | {
      source: 'MANUAL'
      items: { offer_id: string; quantity: number }[]
      introduce: boolean
      production_date?: string | null
      certificate?: CzCertificate | null
    }

export interface CzPendingSignature {
  key: string
  body_b64: string
}

export interface CzJobEvent {
  at: string
  action: string
  ok: boolean
  detail: string
}

export interface CzJob {
  id: number
  connection_id: number
  environment: CzEnvironment
  source: 'SUPPLIES' | 'MANUAL'
  status: CzJobStatus
  failed_status: CzJobStatus | null
  error: string | null
  introduce: boolean
  supplies: CzSupplyRef[]
  items: { offer_id: string; name: string | null; gtin: string; quantity: number; supply_id: string | null }[]
  total_quantity: number
  codes_count: number
  codes_by_status: Record<string, number>
  production_date: string | null
  certificate_type: CzCertificateType | null
  certificate_number: string | null
  certificate_date: string | null
  pending_signatures: CzPendingSignature[]
  /** «<date> - <GTIN> - <product>.pdf», same as the labels download */
  labels_filename: string
  events: CzJobEvent[]
  created_at: string
  updated_at: string
}

const base = (connectionId: number) => `/connections/${connectionId}/chestny-znak`

export const chestnyZnakApi = {
  getSettings: async (connectionId: number): Promise<CzSettingsResponse> =>
    (await api.get(`${base(connectionId)}/settings`)).data,

  saveSettings: async (
    connectionId: number,
    environment: CzEnvironment,
    data: CzSettingsFields & { make_active: boolean }
  ): Promise<CzSettingsResponse> =>
    (await api.put(`${base(connectionId)}/settings/${environment}`, data)).data,

  setActiveEnvironment: async (
    connectionId: number,
    environment: CzEnvironment
  ): Promise<CzSettingsResponse> =>
    (await api.put(`${base(connectionId)}/active-environment`, { environment })).data,

  getAuthStatus: async (connectionId: number): Promise<CzAuthStatus> =>
    (await api.get(`${base(connectionId)}/auth/status`)).data,

  createChallenge: async (connectionId: number): Promise<CzAuthChallenge> =>
    (await api.post(`${base(connectionId)}/auth/challenge`)).data,

  signIn: async (
    connectionId: number,
    data: {
      true_api: { uuid: string; signature: string }
      suz: { uuid: string; signature: string }
    }
  ): Promise<CzAuthStatus> => (await api.post(`${base(connectionId)}/auth/sign-in`, data)).data,

  /** Sandbox only: tokens pasted by the user, no certificate needed */
  tokenSignIn: async (
    connectionId: number,
    data: { true_api_token: string; suz_token: string | null }
  ): Promise<CzAuthStatus> => (await api.post(`${base(connectionId)}/auth/token`, data)).data,

  logout: async (connectionId: number): Promise<void> => {
    await api.post(`${base(connectionId)}/auth/logout`)
  },

  getProducts: async (connectionId: number): Promise<CzProductRow[]> =>
    (await api.get(`${base(connectionId)}/products`)).data,

  updateProducts: async (connectionId: number, rows: CzProductUpdate[]): Promise<void> => {
    await api.put(`${base(connectionId)}/products`, { rows })
  },

  /** Products of a future job with their documents from the GTIN page */
  previewJob: async (connectionId: number, data: CzJobCreate): Promise<CzJobPreview> =>
    (await api.post(`${base(connectionId)}/jobs/preview`, data)).data,

  createJob: async (connectionId: number, data: CzJobCreate): Promise<CzJob> =>
    (await api.post(`${base(connectionId)}/jobs`, data)).data,

  listJobs: async (connectionId: number): Promise<CzJob[]> =>
    (await api.get(`${base(connectionId)}/jobs`)).data,

  jobsBySupply: async (connectionId: number): Promise<Record<string, number>> =>
    (await api.get(`${base(connectionId)}/jobs/by-supply`)).data,

  getJob: async (connectionId: number, jobId: number): Promise<CzJob> =>
    (await api.get(`${base(connectionId)}/jobs/${jobId}`)).data,

  submitSignatures: async (
    connectionId: number,
    jobId: number,
    status: CzJobStatus,
    signatures: { key: string; signature: string }[]
  ): Promise<CzJob> =>
    (await api.post(`${base(connectionId)}/jobs/${jobId}/signatures`, { status, signatures })).data,

  cancelJob: async (connectionId: number, jobId: number): Promise<void> => {
    await api.delete(`${base(connectionId)}/jobs/${jobId}`)
  },

  introduce: async (
    connectionId: number,
    jobId: number,
    data: { production_date: string; certificate: CzCertificate }
  ): Promise<CzJob> => (await api.post(`${base(connectionId)}/jobs/${jobId}/introduce`, data)).data,

  retry: async (
    connectionId: number,
    jobId: number,
    data?: { production_date?: string | null; certificate?: CzCertificate | null }
  ): Promise<CzJob> => (await api.post(`${base(connectionId)}/jobs/${jobId}/retry`, data ?? null)).data,

  /**
   * PDF labels; the file name («<date> - <GTIN> - <product>.pdf») is chosen by
   * the server. `fallbackName` (job.labels_filename) covers proxies that hide
   * Content-Disposition from the browser.
   */
  downloadLabels: async (
    connectionId: number,
    jobId: number,
    supplyId?: string,
    fallbackName?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.get(`${base(connectionId)}/jobs/${jobId}/labels`, {
      params: supplyId ? { supply_id: supplyId } : undefined,
      responseType: 'blob',
    })
    return {
      blob: response.data,
      filename:
        filenameFromContentDisposition(response.headers['content-disposition']) ??
        fallbackName ??
        `Коды ЧЗ, задание ${jobId}.pdf`,
    }
  },
}

/** `attachment; filename*=UTF-8''...` (RFC 5987) or plain `filename="..."`. */
function filenameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      return null
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : null
}

export function czErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/** User-facing text of an API error (incl. blob responses) or a plugin error. */
export async function czErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (axios.isAxiosError(error)) {
    let data: unknown = error.response?.data
    if (data instanceof Blob) {
      try {
        data = JSON.parse(await data.text())
      } catch {
        return fallback
      }
    }
    if (data && typeof data === 'object' && 'detail' in data) {
      return formatDetail((data as { detail: unknown }).detail)
    }
    return error.message || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String(d.msg) : JSON.stringify(d)))
      .join('; ')
  }
  return JSON.stringify(detail)
}
