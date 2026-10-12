import type { CzCertificate } from '../../api/chestnyZnak'
import dayjs, { API_DATE_FORMAT, type Dayjs } from '../../lib/dayjs'

/** Form values shape of the fields below. */
export interface CzCertificateFormValues {
  certificate_type?: CzCertificate['type']
  certificate_number?: string
  certificate_date?: Dayjs
  production_date?: Dayjs
}

/**
 * There is no company-wide default document: a wrong one makes ввод в оборот
 * invalid. The only prefill is the products' own document from the GTIN page,
 * shown for the user to confirm.
 */
export function certificateInitialValues(
  certificate?: CzCertificate | null
): CzCertificateFormValues {
  return {
    production_date: dayjs(),
    ...(certificate && {
      certificate_type: certificate.type,
      certificate_number: certificate.number,
      certificate_date: dayjs(certificate.date),
    }),
  }
}

/** Products with a document on the GTIN page all share one / each has its own / some lack it. */
export function documentsKind(
  items: { certificate_number: string | null; certificate_date: string | null }[],
  common: CzCertificate | null
): 'common' | 'per_product' | 'incomplete' {
  if (common) return 'common'
  return items.length > 0 && items.every((i) => i.certificate_number && i.certificate_date)
    ? 'per_product'
    : 'incomplete'
}

export function certificateFromValues(values: CzCertificateFormValues): {
  certificate: CzCertificate
  production_date: string
} {
  return {
    certificate: {
      type: values.certificate_type!,
      number: values.certificate_number!.trim(),
      date: values.certificate_date!.format(API_DATE_FORMAT),
    },
    production_date: values.production_date!.format(API_DATE_FORMAT),
  }
}

/** Only the production date: each product's document comes from the GTIN page. */
export function productionDateFromValues(values: CzCertificateFormValues): {
  certificate: null
  production_date: string
} {
  return { certificate: null, production_date: values.production_date!.format(API_DATE_FORMAT) }
}
