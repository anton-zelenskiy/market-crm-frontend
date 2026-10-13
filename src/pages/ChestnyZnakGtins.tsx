import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Alert, Button, Card, Checkbox, Input, Space, Typography, Upload, message } from 'antd'
import { SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeAlpine } from 'ag-grid-community'
import type { CellClassParams, CellValueChangedEvent, ColDef } from 'ag-grid-community'
import {
  CZ_CERTIFICATE_TYPE_LABELS,
  chestnyZnakApi,
  czErrorMessage,
  type CzCertificateType,
  type CzProductRow,
  type CzProductUpdate,
} from '../api/chestnyZnak'
import { isValidGtin, normalizeGtin } from '../lib/gtin'
import CzBreadcrumb from '../components/chestnyZnak/CzBreadcrumb'

ModuleRegistry.registerModules([AllCommunityModule])

const CERT_TYPE_VALUES = Object.keys(CZ_CERTIFICATE_TYPE_LABELS) as CzCertificateType[]

function rowErrors(row: CzProductRow): string[] {
  const errors: string[] = []
  if (row.gtin && !isValidGtin(row.gtin)) errors.push(`GTIN ${row.gtin} некорректен`)
  if (row.tnved_code && !/^\d{10}$/.test(row.tnved_code)) errors.push('ТН ВЭД — 10 цифр')
  if (row.certificate_number && (!row.certificate_type || !row.certificate_date)) {
    errors.push('для документа соответствия нужны вид и дата')
  }
  return errors
}

function toUpdate(row: CzProductRow): CzProductUpdate {
  return {
    offer_id: row.offer_id,
    gtin: row.gtin || null,
    product_name: row.product_name?.trim() || null,
    tnved_code: row.tnved_code || null,
    certificate_type: row.certificate_number ? row.certificate_type : null,
    certificate_number: row.certificate_number || null,
    certificate_date: row.certificate_number ? row.certificate_date : null,
  }
}

/** CSV: offer_id;gtin;tnved_code;product_name (comma or semicolon, header optional). */
function parseCsv(
  text: string
): { offer_id: string; gtin: string; tnved_code: string; product_name: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((cols) => cols[0] && !/^offer_?id$/i.test(cols[0]) && !/артикул/i.test(cols[0]))
    .map(([offer_id, gtin = '', tnved_code = '', product_name = '']) => ({
      offer_id,
      gtin,
      tnved_code,
      product_name,
    }))
}

const invalidCell = (check: (value: string) => boolean) => ({
  'cz-invalid-cell': (p: CellClassParams) => !!p.value && !check(String(p.value)),
})

const ChestnyZnakGtins: React.FC = () => {
  const { connectionId: connectionIdParam } = useParams<{ connectionId: string }>()
  const connectionId = Number(connectionIdParam)
  const [rows, setRows] = useState<CzProductRow[]>([])
  const [dirty, setDirty] = useState<Record<string, CzProductRow>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await chestnyZnakApi.getProducts(connectionId))
      setDirty({})
    } catch (e) {
      message.error(await czErrorMessage(e, 'Ошибка загрузки товаров'))
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => {
    load()
  }, [load])

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (!onlyMissing || !r.gtin) &&
        (!q ||
          r.offer_id.toLowerCase().includes(q) ||
          (r.name ?? '').toLowerCase().includes(q) ||
          (r.gtin ?? '').includes(q))
    )
  }, [rows, onlyMissing, search])

  const markDirty = (row: CzProductRow) => {
    setDirty((prev) => ({ ...prev, [row.offer_id]: row }))
    setRows((prev) => prev.map((r) => (r.offer_id === row.offer_id ? row : r)))
  }

  const onCellValueChanged = useCallback((event: CellValueChangedEvent<CzProductRow>) => {
    const row = { ...event.data }
    if (event.colDef.field === 'gtin' && row.gtin) row.gtin = normalizeGtin(String(row.gtin))
    if (event.colDef.field === 'tnved_code' && row.tnved_code) {
      row.tnved_code = String(row.tnved_code).replace(/\s/g, '')
    }
    markDirty(row)
  }, [])

  const columnDefs = useMemo<ColDef<CzProductRow>[]>(
    () => [
      { field: 'offer_id', headerName: 'Артикул', pinned: 'left', width: 180 },
      { field: 'name', headerName: 'Название', flex: 1, minWidth: 220 },
      { field: 'sku', headerName: 'SKU', width: 120 },
      {
        field: 'gtin',
        headerName: 'GTIN',
        editable: true,
        width: 160,
        cellClassRules: invalidCell(isValidGtin),
      },
      {
        field: 'product_name',
        headerName: 'Название на этикетке',
        headerTooltip:
          'Печатается на этикетке ЧЗ и в имени PDF, например «Носки мужские». Если пусто — название из Ozon.',
        editable: true,
        width: 220,
      },
      {
        field: 'tnved_code',
        headerName: 'ТН ВЭД',
        editable: true,
        width: 130,
        cellClassRules: invalidCell((v) => /^\d{10}$/.test(v)),
      },
      {
        field: 'certificate_type',
        headerName: 'Вид документа',
        editable: true,
        width: 210,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: [null, ...CERT_TYPE_VALUES] },
        valueFormatter: (p) =>
          p.value ? CZ_CERTIFICATE_TYPE_LABELS[p.value as CzCertificateType] : '',
      },
      { field: 'certificate_number', headerName: 'Номер документа', editable: true, width: 220 },
      {
        field: 'certificate_date',
        headerName: 'Дата документа',
        editable: true,
        width: 150,
        cellEditor: 'agDateStringCellEditor',
      },
    ],
    []
  )

  const dirtyRows = Object.values(dirty)
  const errors = dirtyRows.flatMap((r) => rowErrors(r).map((e) => `${r.offer_id}: ${e}`))

  const handleSave = async () => {
    if (errors.length) {
      message.error('Исправьте ошибки перед сохранением')
      return
    }
    setSaving(true)
    try {
      await chestnyZnakApi.updateProducts(connectionId, dirtyRows.map(toUpdate))
      message.success(`Сохранено: ${dirtyRows.length}`)
      await load()
    } catch (e) {
      message.error(await czErrorMessage(e, 'Ошибка сохранения'))
    } finally {
      setSaving(false)
    }
  }

  const handleCsv = async (file: File) => {
    const parsed = parseCsv(await file.text())
    const byOffer = new Map(rows.map((r) => [r.offer_id, r]))
    let matched = 0
    const unknown: string[] = []
    for (const line of parsed) {
      const row = byOffer.get(line.offer_id)
      if (!row) {
        unknown.push(line.offer_id)
        continue
      }
      matched++
      markDirty({
        ...row,
        gtin: line.gtin ? normalizeGtin(line.gtin) : row.gtin,
        tnved_code: line.tnved_code ? line.tnved_code.replace(/\s/g, '') : row.tnved_code,
        product_name: line.product_name || row.product_name,
      })
    }
    message.info(
      `Из файла применено строк: ${matched}` +
        (unknown.length ? `, не найдены артикулы: ${unknown.slice(0, 10).join(', ')}` : '') +
        '. Проверьте и нажмите «Сохранить».'
    )
    return false
  }

  return (
    <Card>
      <style>{'.cz-invalid-cell { background: #fff1f0; color: #cf1322; }'}</style>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div className="crm-split-header">
          <div className="crm-split-header__start">
            <CzBreadcrumb connectionId={connectionId} title="GTIN товаров" />
          </div>
          <div className="crm-split-header__end">
            <Upload accept=".csv,.txt" showUploadList={false} beforeUpload={handleCsv}>
              <Button icon={<UploadOutlined />}>Импорт CSV</Button>
            </Upload>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={dirtyRows.length === 0}
              loading={saving}
              onClick={handleSave}
            >
              Сохранить{dirtyRows.length ? ` (${dirtyRows.length})` : ''}
            </Button>
          </div>
        </div>

        <Typography.Title level={2} style={{ margin: 0 }}>
          GTIN товаров
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          GTIN и код ТН ВЭД берутся из карточки товара в Национальном каталоге. У каждого размера
          свой GTIN. «Название на этикетке» печатается на этикетке ЧЗ (например, «Носки мужские»),
          если пусто — название из Ozon. Документ соответствия подставляется в задание ЧЗ.
          CSV для импорта: <code>offer_id;gtin;tnved_code;product_name</code>.
        </Typography.Paragraph>

        {errors.length > 0 && (
          <Alert type="error" showIcon title="Ошибки" description={errors.slice(0, 10).join('; ')} />
        )}

        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Артикул, название или GTIN"
            style={{ width: 320 }}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Checkbox checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)}>
            Только без GTIN ({rows.filter((r) => !r.gtin).length})
          </Checkbox>
        </Space>

        <div style={{ height: 640, width: '100%' }}>
          <AgGridReact<CzProductRow>
            theme={themeAlpine}
            loading={loading}
            rowData={visibleRows}
            columnDefs={columnDefs}
            getRowId={(p) => p.data.offer_id}
            defaultColDef={{ resizable: true, sortable: true, filter: false }}
            singleClickEdit
            stopEditingWhenCellsLoseFocus
            onCellValueChanged={onCellValueChanged}
          />
        </div>
      </Space>
    </Card>
  )
}

export default ChestnyZnakGtins
