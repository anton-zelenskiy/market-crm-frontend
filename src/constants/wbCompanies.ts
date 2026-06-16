export const WB_COMPANY_CONFIGS = [
  { slug: 'kazakova', companyName: 'ИП Казакова Т. А.' },
  { slug: 'altai_flora_plus', companyName: 'ИП Забродин З. Е.' },
  { slug: 'altai_flora', companyName: 'ООО "НПЦ"АЛТАЙСКАЯ ЧАЙНАЯ КОМПАНИЯ' },
  { slug: 'popov', companyName: 'ИП ПОПОВ В.В.' },
] as const

export function getCompanyNameBySlug(slug: string): string | undefined {
  return WB_COMPANY_CONFIGS.find((c) => c.slug === slug)?.companyName
}
