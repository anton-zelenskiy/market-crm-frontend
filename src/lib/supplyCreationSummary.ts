import type { SupplyDataItem, SupplyDraft, SupplySnapshotResponse } from '../api/supplies'

export type SupplyOutcome = 'created' | 'partial' | 'no_timeslot' | 'failed' | 'draft' | 'pending' | 'processing'
export const supplyOutcomeLabels: Record<SupplyOutcome, string> = {
  created: 'Поставка создана', partial: 'Создано частично', no_timeslot: 'Нет таймслотов',
  processing: 'В процессе', failed: 'Ошибка создания', draft: 'Черновик готов', pending: 'Не создано',
}
export const supplyOutcomeColors: Record<SupplyOutcome, string> = {
  created: 'green', partial: 'orange', no_timeslot: 'orange', processing: 'blue', failed: 'red', draft: 'blue', pending: 'default',
}

export function getDraftOutcome(draft: SupplyDraft): SupplyOutcome {
  if (draft.supply_create_info?.order_id) return 'created'
  if (draft.supply_create_info?.error_reasons?.length || draft.errors?.length ||
      /FAILED|ERROR|EXPIRED/.test(draft.supply_create_info?.status || draft.status || '')) return 'failed'
  if (draft.supply_create_info?.timeslot_checked) return 'no_timeslot'
  if (/IN_PROGRESS|PENDING/.test(draft.supply_create_info?.status || '')) return 'processing'
  return /SUCCESS/.test(draft.status || '') ? 'draft' : 'processing'
}

export function buildSupplyCreationSummary(
  products: SupplyDataItem[], drafts: SupplyDraft[], progress?: SupplySnapshotResponse['bulk_supply_progress'],
) {
  const rows = new Map<string, {
    cluster: string; planned: number; created: number; remaining: number | null; unknown: boolean;
    cargoes: number; cargoesUnknown: boolean;
    drafts: SupplyDraft[]; outcome: SupplyOutcome; reasons: string[]; createdOrders: number; attempts: number;
  }>()
  const getRow = (cluster: string) => {
    let row = rows.get(cluster)
    if (!row) {
      row = { cluster, planned: 0, created: 0, remaining: 0, unknown: false, cargoes: 0, cargoesUnknown: false, drafts: [], outcome: 'pending', reasons: [], createdOrders: 0, attempts: 0 }
      rows.set(cluster, row)
    }
    return row
  }
  for (const product of products) {
    for (const cluster of product.clusters || []) {
      if (!cluster.cluster_name || cluster.to_supply <= 0) continue
      const row = getRow(cluster.cluster_name)
      row.planned += cluster.to_supply
    }
  }
  const seenOrders = new Set<number>()
  for (const draft of drafts) {
    if (!draft.cluster?.cluster_name) continue
    const row = getRow(draft.cluster.cluster_name)
    row.drafts.push(draft)
    row.attempts++
    const orderId = draft.supply_create_info?.order_id
    if (!orderId || seenOrders.has(orderId)) continue
    seenOrders.add(orderId)
    row.createdOrders++
    if (draft.products_count == null) row.unknown = true
    else row.created += draft.products_count
    if (draft.cargoes_products_count == null) row.cargoesUnknown = true
    else row.cargoes += draft.cargoes_products_count
  }
  for (const [name, plan] of Object.entries(progress?.clusters || {})) {
    const row = getRow(name)
    row.attempts = Math.max(row.attempts, plan.bundles?.length || 0)
    for (const bundle of plan.bundles || []) {
      // A draft's current state supersedes the saved batch outcome (manual creation).
      if (bundle.draft_id && row.drafts.some(draft => draft.draft_id === bundle.draft_id && draft.supply_create_info?.order_id)) continue
      if (bundle.status === 'failed') row.reasons.push(bundle.error || 'Ошибка создания')
    }
  }
  for (const row of rows.values()) {
    row.remaining = row.unknown ? null : Math.max(0, row.planned - row.created)
    const outcomes = row.drafts.map(getDraftOutcome)
    const noTimeslot = outcomes.includes('no_timeslot')
    const failed = outcomes.includes('failed') || row.reasons.length > 0
    if (noTimeslot) row.reasons.push('Нет таймслотов на выбранную дату')
    if (outcomes.includes('failed')) row.reasons.push('Ошибка создания — откройте черновик')
    if (row.createdOrders) {
      row.outcome = row.remaining === 0 && !noTimeslot && !failed && !outcomes.includes('draft') && !outcomes.includes('processing') ? 'created' : 'partial'
      if (!row.unknown && row.remaining && !noTimeslot && !failed) row.reasons.push('В созданные поставки вошла часть плана')
      if (row.unknown) row.reasons.push('Количество товара в заявках не сохранено')
    } else row.outcome = failed ? 'failed' : noTimeslot ? 'no_timeslot' : outcomes.includes('processing') ? 'processing' : row.drafts.length ? 'draft' : 'pending'
    if (!row.unknown && !row.cargoesUnknown && row.created !== row.cargoes) {
      row.reasons.push('Количество товара в заявках и грузоместах отличается')
      if (row.outcome === 'created') row.outcome = 'partial'
    }
    row.reasons = [...new Set(row.reasons)]
  }
  return {
    rows: [...rows.values()],
    cargoes: [...rows.values()].some(row => row.cargoesUnknown) ? null : [...rows.values()].reduce((sum, row) => sum + row.cargoes, 0),
    planned: [...rows.values()].reduce((sum, row) => sum + row.planned, 0),
    created: [...rows.values()].reduce((sum, row) => sum + row.created, 0),
    remaining: [...rows.values()].some(row => row.unknown) ? null : [...rows.values()].reduce((sum, row) => sum + (row.remaining || 0), 0),
    createdOrders: seenOrders.size,
  }
}
