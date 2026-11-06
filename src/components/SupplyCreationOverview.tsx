import { Alert, Button, Card, Col, Row, Space, Statistic, Tooltip, Typography } from 'antd'
import { buildSupplyCreationSummary } from '../lib/supplyCreationSummary'

const { Text } = Typography
const quantity = (value: number | null) => value === null ? 'Нет данных' : `${value.toLocaleString('ru-RU')} шт.`

type Props = {
  summary: ReturnType<typeof buildSupplyCreationSummary>
  totalBoxCount: number
  totalPalletCount: string
  plannedDate?: string | null
  onShowProblems: () => void
}

export default function SupplyCreationOverview({ summary, totalBoxCount, totalPalletCount, plannedDate, onShowProblems }: Props) {
  const attempted = summary.rows.some(row => row.drafts.length || row.reasons.length)
  const problems = summary.rows.filter(row => row.outcome !== 'created' && (row.planned > 0 || row.drafts.length))
  const noSlots = summary.rows.filter(row => row.drafts.some(draft => !draft.supply_create_info?.order_id && draft.supply_create_info?.timeslot_checked)).length
  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        {[
          {
            title: 'План к поставке',
            value: `${quantity(summary.planned)} / ${totalBoxCount.toLocaleString('ru-RU')} кор. / ${totalPalletCount} пал.`,
            tooltip: 'Количество товара по плану / количество коробок / расчётное количество паллет (1 паллета = 40 коробок). Коробки рассчитаны по кратности товаров, паллеты округлены до десятых.',
            detail: `${summary.rows.filter(row => row.planned > 0).length} кластеров`,
          },
          { title: 'В созданных поставках', value: quantity(summary.remaining === null ? null : summary.created), detail: `Создано заявок: ${summary.createdOrders} · В грузоместах: ${quantity(summary.cargoes)}` },
          { title: 'Осталось создать', value: quantity(summary.remaining), detail: 'Количество из плана вне созданных поставок' },
        ].map(card => (
          <Col xs={24} md={8} key={card.title}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title={card.title} value={card.value}
                formatter={card.tooltip ? () => (
                  <Tooltip title={card.tooltip}>
                    <span tabIndex={0} style={{ cursor: 'help' }}>{card.value}</span>
                  </Tooltip>
                ) : undefined}
              />
              <Text type="secondary">{card.detail}</Text>
            </Card>
          </Col>
        ))}
      </Row>
      {attempted && problems.length > 0 && (
        <Alert type="warning" showIcon title="Есть поставки, требующие внимания"
          description={
            <Space orientation="vertical" size={4}>
              <span>{summary.remaining === null ? 'Количество товара для части заявок не сохранено. Итоговые количества пока неизвестны.' : summary.remaining > 0 ? `${quantity(summary.remaining)} из плана остаются вне созданных поставок.` : 'Проверьте результаты создания и количество товара в заявках и грузоместах.'}</span>
              {noSlots > 0 && <span>Нет таймслотов: {noSlots} кластеров{plannedDate ? ` (дата: ${plannedDate})` : ''}. Откройте черновики для выбора даты и создания поставок.</span>}
            </Space>
          }
          action={<Button size="small" onClick={onShowProblems}>Показать проблемы</Button>}
        />
      )}
      {attempted && problems.length === 0 && summary.planned > 0 && (
        <Alert type="success" showIcon title="Весь план включён в созданные поставки" />
      )}
    </Space>
  )
}
