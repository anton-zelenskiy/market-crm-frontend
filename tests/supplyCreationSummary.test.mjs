import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/supplyCreationSummary.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { buildSupplyCreationSummary: summarize, getDraftOutcome } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const product = (clusters = [{ cluster_name: 'Москва', to_supply: 100 }]) => ({ offer_id: 'sku', clusters })
const draft = (id, info = {}, items = undefined, cluster = 'Москва') => ({
  id, draft_id: id, cluster: { cluster_name: cluster }, status: 'SUCCESS',
  storage_warehouses: [{ products: [{ offer_id: 'sku', quantity: 999 }] }],
  supply_create_info: info, products_count: items?.reduce((sum, item) => sum + item.quantity, 0), cargoes_products_count: items?.reduce((sum, item) => sum + item.quantity, 0),
})
const items = quantity => [{ offer_id: 'sku', quantity }]

test('split cluster with missing timeslot stays partial and uses actual quantities', () => {
  const result = summarize([product()], [draft(1, { order_id: 10 }, items(60)), draft(2, { timeslot_checked: true })])
  assert.equal(result.rows[0].outcome, 'partial')
  assert.equal(result.created, 60)
  assert.equal(result.remaining, 40)
})
test('draft SUCCESS without order is never a created supply', () => {
  assert.equal(getDraftOutcome(draft(1)), 'draft')
  assert.equal(getDraftOutcome(draft(1, { timeslot_checked: true })), 'no_timeslot')
  assert.equal(getDraftOutcome(draft(1, { error_reasons: ['FAILED'] })), 'failed')
  assert.equal(summarize([product()], [draft(1)]).remaining, 100)
  assert.equal(getDraftOutcome(draft(1, { status: 'IN_PROGRESS' })), 'processing')
})
test('unknown actual contents stay unknown instead of showing zero', () => {
  const result = summarize([product()], [draft(1, { order_id: 10 })])
  assert.equal(result.remaining, null)
  assert.equal(result.rows[0].remaining, null)
  assert.equal(result.rows[0].outcome, 'partial')
})
test('duplicate order references count once', () => {
  const result = summarize([product()], [draft(1, { order_id: 10 }, items(100)), draft(2, { order_id: 10 }, items(100))])
  assert.equal(result.created, 100)
  assert.equal(result.createdOrders, 1)
  assert.equal(result.rows[0].outcome, 'created')
})
test('oversupply in one cluster does not cover another cluster shortage', () => {
  const result = summarize([product([{ cluster_name: 'Москва', to_supply: 50 }, { cluster_name: 'Омск', to_supply: 50 }])], [draft(1, { order_id: 10 }, items(100))])
  assert.equal(result.remaining, 50)
})
test('batch failure with no draft persists, manual creation supersedes stale failure', () => {
  const progress = { clusters: { Москва: { bundles: [{ status: 'failed', draft_id: 1, error: 'Ozon unavailable' }] } } }
  assert.equal(summarize([product()], [], progress).rows[0].outcome, 'failed')
  assert.equal(summarize([product()], [draft(1)], progress).rows[0].outcome, 'failed')
  const result = summarize([product()], [draft(1, { order_id: 10 }, items(100))], progress)
  assert.equal(result.rows[0].outcome, 'created')
  assert.deepEqual(result.rows[0].reasons, [])
})
test('accepted quantity reduction shows remaining plan', () => {
  const result = summarize([product()], [draft(1, { order_id: 10 }, items(80))])
  assert.equal(result.remaining, 20)
  assert.equal(result.rows[0].outcome, 'partial')
  assert.equal(result.rows[0].reasons.length, 1)
})

test('saved cargo counts are separate from quantities in the order', () => {
  const saved = { ...draft(1, { order_id: 10 }, items(100)), cargoes_products_count: 80 }
  const result = summarize([product()], [saved])
  assert.equal(result.created, 100)
  assert.equal(result.cargoes, 80)
  assert.equal(result.rows[0].reasons.includes('Количество товара в заявках и грузоместах отличается'), true)
})
