/**
 * Thin wrapper over «КриптоПро ЭЦП Browser plug-in» (public/cadesplugin_api.js).
 * The private key never leaves the user's token: we only ask the plugin to sign.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    cadesplugin?: any
  }
}

export interface CryptoCertificate {
  thumbprint: string
  subjectName: string
  /** Owner name shown in UI: organisation or full name */
  owner: string
  cn: string
  inn: string | null
  innLe: string | null
  validFrom: Date
  validTo: Date
  issuer: string
  isValid: boolean
}

export class CryptoProError extends Error {}

const PLUGIN_LOAD_TIMEOUT_MS = 20000
let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.cadesplugin) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `${import.meta.env.BASE_URL}cadesplugin_api.js`
    script.onload = () => resolve()
    script.onerror = () => reject(new CryptoProError('Не удалось загрузить cadesplugin_api.js'))
    document.head.appendChild(script)
  })
}

/**
 * Load the plugin once and return the `cadesplugin` object.
 *
 * `window.cadesplugin` is itself a Promise (resolving to undefined) with the API
 * methods attached to it, so it must never be returned from an async function
 * or passed to resolve(): that would unwrap it to `undefined`. Hence the wrapper.
 */
export async function loadCadesPlugin(): Promise<{ api: any }> {
  await ensurePluginLoaded()
  if (typeof window.cadesplugin?.CreateObjectAsync !== 'function') {
    throw new CryptoProError(
      'КриптоПро ЭЦП Browser plug-in загружен без API. Проверьте, что расширение браузера включено, и обновите страницу.'
    )
  }
  return { api: window.cadesplugin }
}

function ensurePluginLoaded(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      await loadScript()
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new CryptoProError(
                'КриптоПро ЭЦП Browser plug-in не отвечает. Проверьте, что плагин и расширение браузера установлены и включены, и разрешите сайту доступ к плагину.'
              )
            ),
          PLUGIN_LOAD_TIMEOUT_MS
        )
      )
      try {
        await Promise.race([window.cadesplugin, timeout])
      } catch (e) {
        throw toCryptoProError(e)
      }
    })()
    // Allow a retry after the user installs/enables the plugin
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

function toCryptoProError(e: unknown): CryptoProError {
  if (e instanceof CryptoProError) return e
  const raw = e instanceof Error ? e.message : String(e ?? '')
  const lower = raw.toLowerCase()
  if (lower.includes('0x8010006e') || lower.includes('отменена пользователем') || lower.includes('cancel')) {
    return new CryptoProError('Операция отменена пользователем')
  }
  if (lower.includes('0x8009001d') || lower.includes('0x80090016') || lower.includes('ключ не существует')) {
    return new CryptoProError('Не найден закрытый ключ. Вставьте токен с ЭЦП и попробуйте снова')
  }
  if (lower.includes('0x8010006b') || lower.includes('pin')) {
    return new CryptoProError('Неверный PIN-код токена')
  }
  if (lower.includes('plugin') || lower.includes('плагин') || lower.includes('not loaded')) {
    return new CryptoProError(
      'КриптоПро ЭЦП Browser plug-in не загружен. Установите плагин и расширение браузера, затем обновите страницу.'
    )
  }
  return new CryptoProError(raw || 'Ошибка КриптоПро')
}

/** Parse `CN=..., O="ООО ""Ромашка""", ИНН=..., ...` into a map. */
export function parseDistinguishedName(dn: string): Record<string, string> {
  const result: Record<string, string> = {}
  let i = 0
  while (i < dn.length) {
    while (dn[i] === ' ' || dn[i] === ',') i++
    const eq = dn.indexOf('=', i)
    if (eq < 0) break
    const key = dn.slice(i, eq).trim()
    i = eq + 1
    let value = ''
    if (dn[i] === '"') {
      i++
      while (i < dn.length) {
        if (dn[i] === '"' && dn[i + 1] === '"') {
          value += '"'
          i += 2
        } else if (dn[i] === '"') {
          i++
          break
        } else {
          value += dn[i++]
        }
      }
      while (i < dn.length && dn[i] !== ',') i++
    } else {
      const comma = dn.indexOf(',', i)
      const end = comma < 0 ? dn.length : comma
      value = dn.slice(i, end).trim()
      i = end
    }
    if (key && !(key in result)) result[key] = value
  }
  return result
}

function pick(dn: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (dn[key]) return dn[key]
  }
  return null
}

async function openStore(plugin: any): Promise<any> {
  const store = await plugin.CreateObjectAsync('CAdESCOM.Store')
  await store.Open(
    plugin.CAPICOM_CURRENT_USER_STORE,
    plugin.CAPICOM_MY_STORE,
    plugin.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED
  )
  return store
}

/** Certificates of the current user that have a private key (expired ones included, flagged). */
export async function listCertificates(): Promise<CryptoCertificate[]> {
  const { api: plugin } = await loadCadesPlugin()
  try {
    const store = await openStore(plugin)
    try {
      const certs = await store.Certificates
      const count: number = await certs.Count
      const now = new Date()
      const result: CryptoCertificate[] = []
      for (let i = 1; i <= count; i++) {
        const cert = await certs.Item(i)
        let hasKey = false
        try {
          hasKey = await cert.HasPrivateKey()
        } catch {
          hasKey = false
        }
        if (!hasKey) continue
        const subjectName: string = await cert.SubjectName
        const dn = parseDistinguishedName(subjectName)
        const issuerDn = parseDistinguishedName(await cert.IssuerName)
        const validFrom = new Date(await cert.ValidFromDate)
        const validTo = new Date(await cert.ValidToDate)
        const cn = pick(dn, 'CN') ?? subjectName
        const person = [pick(dn, 'SN'), pick(dn, 'G')].filter(Boolean).join(' ')
        result.push({
          thumbprint: await cert.Thumbprint,
          subjectName,
          owner: pick(dn, 'O') ?? (person || cn),
          cn,
          inn: pick(dn, 'ИНН', 'INN', 'OID.1.2.643.3.131.1.1'),
          innLe: pick(dn, 'ИНН ЮЛ', 'INNLE', 'OID.1.2.643.100.4'),
          validFrom,
          validTo,
          issuer: pick(issuerDn, 'CN') ?? '',
          isValid: validFrom <= now && now <= validTo,
        })
      }
      return result.sort((a, b) => b.validTo.getTime() - a.validTo.getTime())
    } finally {
      await store.Close()
    }
  } catch (e) {
    throw toCryptoProError(e)
  }
}

async function findCertificate(plugin: any, thumbprint: string): Promise<any> {
  const store = await openStore(plugin)
  try {
    const certs = await store.Certificates
    const found = await certs.Find(plugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint)
    if ((await found.Count) === 0) {
      throw new CryptoProError('Сертификат не найден. Вставьте токен с выбранной ЭЦП')
    }
    return await found.Item(1)
  } finally {
    await store.Close()
  }
}

/**
 * CAdES-BES signature of base64-encoded bytes.
 * detached=false for ЧЗ auth (attached), true for documents / X-Signature.
 */
export async function signBase64(
  thumbprint: string,
  dataB64: string,
  detached: boolean
): Promise<string> {
  const { api: plugin } = await loadCadesPlugin()
  try {
    const certificate = await findCertificate(plugin, thumbprint)
    const signer = await plugin.CreateObjectAsync('CAdESCOM.CPSigner')
    await signer.propset_Certificate(certificate)
    await signer.propset_CheckCertificate(true)
    const signedData = await plugin.CreateObjectAsync('CAdESCOM.CadesSignedData')
    await signedData.propset_ContentEncoding(plugin.CADESCOM_BASE64_TO_BINARY)
    await signedData.propset_Content(dataB64)
    const signature: string = await signedData.SignCades(
      signer,
      plugin.CADESCOM_CADES_BES,
      detached
    )
    return signature.replace(/[\r\n]/g, '')
  } catch (e) {
    throw toCryptoProError(e)
  }
}

/** UTF-8 safe base64 of a string (btoa only handles Latin-1). */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export function describeCertificate(cert: CryptoCertificate): string {
  const inn = cert.innLe ?? cert.inn
  const until = cert.validTo.toLocaleDateString('ru-RU')
  return `${cert.owner}${inn ? `, ИНН ${inn}` : ''}, до ${until}${cert.isValid ? '' : ' (недействителен)'}`
}
