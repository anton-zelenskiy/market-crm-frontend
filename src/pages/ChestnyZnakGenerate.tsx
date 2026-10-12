import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { chestnyZnakApi, czErrorMessage, type CzProductRow } from '../api/chestnyZnak'
import CzBreadcrumb from '../components/chestnyZnak/CzBreadcrumb'
import CzEnvBadge from '../components/chestnyZnak/CzEnvBadge'
import CzMarkingJobModal, { type CzJobDraft } from '../components/chestnyZnak/CzMarkingJobModal'
import { useCzAuthStatus } from '../components/chestnyZnak/czAuth'

interface Line {
  offer_id: string
  quantity: number
}

const LARGE_QUANTITY = 1000

const ChestnyZnakGenerate: React.FC = () => {
  const { connectionId: connectionIdParam } = useParams<{ connectionId: string }>()
  const connectionId = Number(connectionIdParam)
  const navigate = useNavigate()
  const auth = useCzAuthStatus(connectionId)
  const [products, setProducts] = useState<CzProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState<Line[]>([{ offer_id: '', quantity: 1 }])
  const [draft, setDraft] = useState<CzJobDraft | null>(null)

  useEffect(() => {
    chestnyZnakApi
      .getProducts(connectionId)
      .then(setProducts)
      .catch(async (e) => message.error(await czErrorMessage(e, 'Ошибка загрузки товаров')))
      .finally(() => setLoading(false))
  }, [connectionId])

  const byOffer = useMemo(() => new Map(products.map((p) => [p.offer_id, p])), [products])
  const options = useMemo(
    () =>
      products.map((p) => ({
        value: p.offer_id,
        disabled: !p.gtin,
        label: `${p.offer_id} — ${p.name ?? ''}${p.gtin ? ` (GTIN ${p.gtin})` : ' — нет GTIN'}`,
      })),
    [products]
  )

  const validLines = lines.filter((l) => l.offer_id && l.quantity > 0)
  const total = validLines.reduce((acc, l) => acc + l.quantity, 0)
  const duplicate = new Set(validLines.map((l) => l.offer_id)).size !== validLines.length
  const price = auth.status?.code_price_rub ?? 0

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const start = () => {
    const run = () =>
      setDraft({
        source: 'MANUAL',
        items: validLines,
        title: `Генерация кодов: ${total} шт.`,
      })
    if (total >= LARGE_QUANTITY) {
      Modal.confirm({
        title: `Будет заказано ${total} кодов. Продолжить?`,
        okText: 'Продолжить',
        cancelText: 'Отмена',
        onOk: run,
      })
      return
    }
    run()
  }

  return (
    <Card>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <CzBreadcrumb connectionId={connectionId} title="Генерация кодов" />
        <Space align="center">
          <Typography.Title level={2} style={{ margin: 0 }}>
            Генерация кодов маркировки
          </Typography.Title>
          <CzEnvBadge environment={auth.status?.environment} />
        </Space>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          Заказ кодов для конкретных товаров с произвольным количеством. Для проверки интеграции
          закажите 1 код сначала в песочнице, затем в Production. Нет GTIN у товара?{' '}
          <Link to={`/connections/${connectionId}/chestny-znak/gtins`}>Укажите его</Link>.
        </Typography.Paragraph>

        {auth.status && !auth.status.configured && (
          <Alert
            type="warning"
            showIcon
            title="Честный знак не настроен"
            action={
              <Button onClick={() => navigate(`/connections/${connectionId}#chestny-znak`)}>
                Настройки
              </Button>
            }
          />
        )}

        <Table
          size="small"
          loading={loading}
          pagination={false}
          rowKey={(_, index) => String(index)}
          dataSource={lines}
          columns={[
            {
              title: 'Товар',
              render: (_, line, index) => (
                <Select
                  showSearch
                  style={{ width: '100%', minWidth: 420 }}
                  placeholder="Артикул или название"
                  value={line.offer_id || undefined}
                  options={options}
                  optionFilterProp="label"
                  onChange={(value) => updateLine(index, { offer_id: value })}
                />
              ),
            },
            {
              title: 'GTIN',
              width: 160,
              render: (_, line) => byOffer.get(line.offer_id)?.gtin ?? '—',
            },
            {
              title: 'Количество кодов',
              width: 170,
              render: (_, line, index) => (
                <InputNumber
                  min={1}
                  max={10000}
                  precision={0}
                  value={line.quantity}
                  onChange={(value) => updateLine(index, { quantity: value ?? 1 })}
                />
              ),
            },
            {
              width: 60,
              render: (_, __, index) => (
                <Button
                  icon={<DeleteOutlined />}
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                />
              ),
            },
          ]}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => setLines((prev) => [...prev, { offer_id: '', quantity: 1 }])}
        >
          Добавить товар
        </Button>

        {duplicate && <Alert type="warning" showIcon title="Один товар выбран несколько раз" />}

        <Space align="center" size="large">
          <Typography.Text strong>
            Всего кодов: {total}
            {price > 0 &&
              `, ≈ ${(total * price).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`}
          </Typography.Text>
          <Button
            type="primary"
            size="large"
            disabled={total === 0 || duplicate || !auth.status?.configured}
            onClick={start}
          >
            Сгенерировать
          </Button>
          <Button onClick={() => navigate(`/connections/${connectionId}/chestny-znak/jobs`)}>
            Задания ЧЗ
          </Button>
        </Space>
      </Space>

      <CzMarkingJobModal
        open={!!draft}
        connectionId={connectionId}
        draft={draft}
        onClose={() => {
          setDraft(null)
          auth.reload()
        }}
      />
    </Card>
  )
}

export default ChestnyZnakGenerate
