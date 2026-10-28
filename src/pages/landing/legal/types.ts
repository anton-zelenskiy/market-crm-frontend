/**
 * A paragraph, or a bulleted list. Inline links use markdown syntax for internal paths:
 * `[Политика конфиденциальности](/privacy)`.
 */
export type LegalBlock = string | { list: string[] }

export interface LegalSection {
  title: string
  blocks: LegalBlock[]
}

export interface LegalDocumentContent {
  title: string
  description: string
  sections: LegalSection[]
}
