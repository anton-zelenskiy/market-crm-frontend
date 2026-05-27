import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd'
import dayjs, { type Dayjs } from '../lib/dayjs'
import {
  bookkeepingApi,
  type FinanceBank,
  type FinanceBookkeepingArticle,
  type FinanceBookkeepingArticleCatalog,
  type FinanceBookkeepingArticleCreate,
  type FinanceWallet,
} from '../api/bookkeeping'

const { Text } = Typography

const ACTIVITY_OPTIONS = [
  'Операционная',
  'Финансовая',
  'Инвестиционная',
  'Техническая операция',
]

const FLOW_GROUP_OPTIONS = ['Поступление', 'Выбытие']

type OpeningBalanceDraft = {
  amount: number | null
  month: Dayjs
}

interface BookkeepingDdsSettingsProps {
  connectionId: number
}

const BookkeepingDdsSettings: React.FC<BookkeepingDdsSettingsProps> = ({ connectionId }) => {
  const [catalogArticles, setCatalogArticles] = useState<FinanceBookkeepingArticleCatalog[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [wallets, setWallets] = useState<FinanceWallet[]>([])
  const [articles, setArticles] = useState<FinanceBookkeepingArticle[]>([])
  const [banks, setBanks] = useState<FinanceBank[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [balanceDrafts, setBalanceDrafts] = useState<Record<number, OpeningBalanceDraft>>({})
  const [savingBalanceId, setSavingBalanceId] = useState<number | null>(null)
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<FinanceBookkeepingArticle | null>(null)
  const [articleForm] = Form.useForm()
  const [walletForm] = Form.useForm()

  const initBalanceDrafts = useCallback((walletRows: FinanceWallet[]) => {
    const drafts: Record<number, OpeningBalanceDraft> = {}
    for (const w of walletRows) {
      const bal = w.opening_balances[0]
      drafts[w.id] = {
        amount: bal ? parseFloat(bal.amount) : null,
        month: bal ? dayjs(bal.effective_from).startOf('month') : dayjs().startOf('month'),
      }
    }
    setBalanceDrafts(drafts)
  }, [])

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const rows = await bookkeepingApi.listCatalogArticles()
      setCatalogArticles(rows)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Не удалось загрузить каталог статей')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const loadConnectionData = useCallback(async () => {
    setLoading(true)
    try {
      const [walletRows, articleRows, bankRows] = await Promise.all([
        bookkeepingApi.listWallets(connectionId),
        bookkeepingApi.listBookkeepingArticles(connectionId),
        bookkeepingApi.listBanks(),
      ])
      setWallets(walletRows)
      setArticles(articleRows)
      setBanks(bankRows)
      initBalanceDrafts(walletRows)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка загрузки настроек ДДС')
    } finally {
      setLoading(false)
    }
  }, [connectionId, initBalanceDrafts])

  useEffect(() => {
    void loadCatalog()
    void loadConnectionData()
  }, [loadCatalog, loadConnectionData])

  const handleImportArticles = async () => {
    setImporting(true)
    try {
      const r = await bookkeepingApi.importArticlesFromCatalog(connectionId)
      message.success(`Статей +${r.articles_created}, правил +${r.rules_created}`)
      await loadConnectionData()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка импорта статей')
    } finally {
      setImporting(false)
    }
  }

  const saveOpeningBalance = async (walletId: number) => {
    const draft = balanceDrafts[walletId]
    if (!draft || draft.amount == null || Number.isNaN(draft.amount)) {
      message.warning('Укажите сумму сальдо')
      return
    }
    setSavingBalanceId(walletId)
    try {
      await bookkeepingApi.upsertOpeningBalance(connectionId, walletId, {
        effective_from: draft.month.startOf('month').format('YYYY-MM-DD'),
        amount: draft.amount,
      })
      message.success('Сальдо сохранено')
      await loadConnectionData()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Ошибка сохранения сальдо')
    } finally {
      setSavingBalanceId(null)
    }
  }

  const submitWallet = async () => {
    const v = await walletForm.validateFields()
    await bookkeepingApi.createWallet(connectionId, {
      name: v.name,
      bank_id: v.bank_id ?? null,
      is_active: true,
    })
    message.success('Кошелёк создан')
    setWalletModalOpen(false)
    walletForm.resetFields()
    await loadConnectionData()
  }

  const submitArticle = async () => {
    const v = await articleForm.validateFields()
    const body: FinanceBookkeepingArticleCreate = {
      name: v.name,
      flow_group: v.flow_group,
      activity_type: v.activity_type,
      sub_article: v.sub_article,
      source_hint: v.source_hint,
      requires_platform: v.requires_platform ?? false,
      is_active: v.is_active ?? true,
    }
    if (editingArticle) {
      await bookkeepingApi.updateBookkeepingArticle(connectionId, editingArticle.id, body)
      message.success('Статья обновлена')
    } else {
      await bookkeepingApi.createBookkeepingArticle(connectionId, body)
      message.success('Статья создана')
    }
    setArticleModalOpen(false)
    await loadConnectionData()
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Text type="secondary">
          Каталог статей ДДС — общий справочник. Перед работой с операциями просмотрите каталог и
          импортируйте статьи в это подключение.
        </Text>
      </div>

      <Space wrap>
        <Button type="primary" loading={importing} onClick={() => void handleImportArticles()}>
          Импортировать статьи в подключение
        </Button>
        <Button onClick={() => void loadCatalog()} loading={catalogLoading}>
          Обновить каталог
        </Button>
      </Space>

      <Table
        size="small"
        rowKey="id"
        loading={catalogLoading}
        dataSource={catalogArticles}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Статья', dataIndex: 'name', width: 220 },
          { title: 'Группа', dataIndex: 'flow_group', width: 120 },
          { title: 'Вид деятельности', dataIndex: 'activity_type', width: 160 },
          {
            title: 'Платформа',
            dataIndex: 'requires_platform',
            width: 100,
            render: (v: boolean) => (v ? 'да' : ''),
          },
        ]}
      />

      <Tabs
        items={[
          {
            key: 'wallets',
            label: 'Кошельки и сальдо',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" onClick={() => setWalletModalOpen(true)}>
                    Добавить кошелёк
                  </Button>
                </Space>
                <Table
                  size="small"
                  rowKey="id"
                  loading={loading}
                  dataSource={wallets}
                  pagination={false}
                  columns={[
                    { title: 'Кошелёк', dataIndex: 'name' },
                    { title: 'Банк', dataIndex: 'bank_display_name', width: 140 },
                    {
                      title: 'Сальдо',
                      width: 160,
                      render: (_, w) => (
                        <InputNumber
                          style={{ width: '100%' }}
                          value={balanceDrafts[w.id]?.amount ?? undefined}
                          onChange={(val) =>
                            setBalanceDrafts((prev) => ({
                              ...prev,
                              [w.id]: {
                                amount: val ?? null,
                                month: prev[w.id]?.month ?? dayjs().startOf('month'),
                              },
                            }))
                          }
                        />
                      ),
                    },
                    {
                      title: 'Месяц',
                      width: 140,
                      render: (_, w) => (
                        <DatePicker
                          picker="month"
                          format="MM.YYYY"
                          style={{ width: '100%' }}
                          value={balanceDrafts[w.id]?.month}
                          onChange={(d) => {
                            if (!d) return
                            setBalanceDrafts((prev) => ({
                              ...prev,
                              [w.id]: {
                                amount: prev[w.id]?.amount ?? null,
                                month: d.startOf('month'),
                              },
                            }))
                          }}
                        />
                      ),
                    },
                    {
                      title: '',
                      width: 100,
                      render: (_, w) => (
                        <Button
                          size="small"
                          loading={savingBalanceId === w.id}
                          onClick={() => void saveOpeningBalance(w.id)}
                        >
                          Сохранить
                        </Button>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: 'articles',
            label: 'Статьи подключения',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      setEditingArticle(null)
                      articleForm.resetFields()
                      articleForm.setFieldsValue({
                        flow_group: 'Выбытие',
                        activity_type: 'Операционная',
                        is_active: true,
                      })
                      setArticleModalOpen(true)
                    }}
                  >
                    Новая статья
                  </Button>
                </Space>
                <Table
                  size="small"
                  rowKey="id"
                  loading={loading}
                  dataSource={articles}
                  pagination={{ pageSize: 15 }}
                  columns={[
                    { title: 'Статья', dataIndex: 'name' },
                    { title: 'Группа', dataIndex: 'flow_group', width: 110 },
                    { title: 'Вид деятельности', dataIndex: 'activity_type', width: 140 },
                    {
                      title: '',
                      width: 80,
                      render: (_, row) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            setEditingArticle(row)
                            articleForm.setFieldsValue(row)
                            setArticleModalOpen(true)
                          }}
                        >
                          Изм.
                        </Button>
                      ),
                    },
                    {
                      title: '',
                      width: 80,
                      render: (_, row) => (
                        <Popconfirm
                          title="Удалить статью?"
                          onConfirm={async () => {
                            await bookkeepingApi.deleteBookkeepingArticle(connectionId, row.id)
                            message.success('Удалено')
                            await loadConnectionData()
                          }}
                        >
                          <Button type="link" size="small" danger>
                            Удал.
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Новый кошелёк"
        open={walletModalOpen}
        onOk={() => void submitWallet()}
        onCancel={() => setWalletModalOpen(false)}
        destroyOnClose
      >
        <Form form={walletForm} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bank_id" label="Банк">
            <Select
              allowClear
              options={banks.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingArticle ? 'Редактировать статью' : 'Новая статья ДДС'}
        open={articleModalOpen}
        onOk={() => void submitArticle()}
        onCancel={() => setArticleModalOpen(false)}
        destroyOnClose
      >
        <Form form={articleForm} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="flow_group" label="Группа" rules={[{ required: true }]}>
            <Select options={FLOW_GROUP_OPTIONS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="activity_type" label="Вид деятельности" rules={[{ required: true }]}>
            <Select options={ACTIVITY_OPTIONS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="sub_article" label="Субстатья">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="source_hint" label="Источник данных">
            <Select
              allowClear
              options={[
                { value: 'platform', label: 'Платформы' },
                { value: 'bank', label: 'Банк' },
                { value: 'manual', label: 'Вручную' },
              ]}
            />
          </Form.Item>
          <Form.Item name="requires_platform" label="Нужна платформа" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_active" label="Активна" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default BookkeepingDdsSettings
