import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Form,
  Modal,
  Result,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import {
  CZ_CERTIFICATE_TYPE_LABELS,
  CZ_JOB_STATUS_LABELS,
  CZ_POLLED_STATUSES,
  chestnyZnakApi,
  czErrorMessage,
  czErrorStatus,
  type CzJob,
  type CzJobCreate,
  type CzJobPreview,
  type CzJobStatus,
} from '../../api/chestnyZnak'
import { signBase64 } from '../../lib/cryptopro'
import { downloadBlob } from '../../lib/downloadBlob'
import { formatDate, formatDateTime } from '../../lib/dayjs'
import CzAuthPanel from './CzAuthPanel'
import CzCertificateFields from './CzCertificateFields'
import { getSandboxUnsigned, getSavedThumbprint, useCzAuthStatus } from './czAuth'
import {
  certificateFromValues,
  certificateInitialValues,
  documentsKind,
  productionDateFromValues,
  type CzCertificateFormValues,
} from './czCertificate'
import CzEnvBadge from './CzEnvBadge'

const POLL_MS = 3000

/** What to create: everything except the introduce/certificate part filled in the modal. */
export type CzJobDraft =
  | { source: 'SUPPLIES'; supplies: { supply_id: string; order_id: string }[]; title: string }
  | { source: 'MANUAL'; items: { offer_id: string; quantity: number }[]; title: string }

interface CzMarkingJobModalProps {
  open: boolean
  connectionId: number
  /** New job to create */
  draft?: CzJobDraft | null
  /** Existing job to continue */
  jobId?: number | null
  /** Default for the «Ввести в оборот» checkbox of a new job */
  defaultIntroduce?: boolean
  onClose: () => void
  onJobChanged?: (job: CzJob) => void
}

function draftPayload(draft: CzJobDraft, extra: Partial<CzJobCreate>): CzJobCreate {
  return (
    draft.source === 'SUPPLIES'
      ? { source: 'SUPPLIES', supplies: draft.supplies, introduce: false, ...extra }
      : { source: 'MANUAL', items: draft.items, introduce: false, ...extra }
  ) as CzJobCreate
}

function stepIndex(status: CzJobStatus, introduce: boolean): number {
  const order: CzJobStatus[] = introduce
    ? [
        'AWAIT_ORDER_SIGNATURE',
        'ORDERING',
        'AWAIT_UTILISATION_SIGNATURE',
        'APPLYING',
        'AWAIT_INTRODUCE_SIGNATURE',
        'INTRODUCING',
        'DONE',
      ]
    : ['AWAIT_ORDER_SIGNATURE', 'ORDERING', 'CODES_READY']
  const steps = introduce ? [0, 1, 2, 2, 3, 3, 4] : [0, 1, 2]
  const idx = order.indexOf(status === 'CODES_READY' && introduce ? 'AWAIT_UTILISATION_SIGNATURE' : status)
  return idx < 0 ? 0 : steps[idx]
}

const CzMarkingJobModal: React.FC<CzMarkingJobModalProps> = ({
  open,
  connectionId,
  draft,
  jobId,
  defaultIntroduce = true,
  onClose,
  onJobChanged,
}) => {
  const auth = useCzAuthStatus(connectionId)
  const [job, setJob] = useState<CzJob | null>(null)
  const [introduce, setIntroduce] = useState(defaultIntroduce)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<CzJobPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [form] = Form.useForm<CzCertificateFormValues>()
  const onJobChangedRef = useRef(onJobChanged)
  onJobChangedRef.current = onJobChanged

  const updateJob = (next: CzJob) => {
    setJob(next)
    onJobChangedRef.current?.(next)
  }

  useEffect(() => {
    if (!open) return
    setJob(null)
    setIntroduce(defaultIntroduce)
    setPreview(null)
    form.resetFields()
    form.setFieldsValue(certificateInitialValues())
    if (draft && !jobId) {
      // Prefill the document from the GTIN page; the user may still change it
      setPreviewLoading(true)
      chestnyZnakApi
        .previewJob(connectionId, draftPayload(draft, {}))
        .then((result) => {
          setPreview(result)
          form.setFieldsValue(certificateInitialValues(result.certificate))
        })
        .catch(async (e) => message.error(await czErrorMessage(e, 'Ошибка проверки товаров')))
        .finally(() => setPreviewLoading(false))
    }
    if (jobId) {
      chestnyZnakApi
        .getJob(connectionId, jobId)
        .then(updateJob)
        .catch(async (e) => message.error(await czErrorMessage(e, 'Ошибка загрузки задания')))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId, connectionId])

  // Poll while ЧЗ processes the job in background
  useEffect(() => {
    if (!open || !job || !CZ_POLLED_STATUSES.includes(job.status)) return
    const timer = setInterval(async () => {
      try {
        updateJob(await chestnyZnakApi.getJob(connectionId, job.id))
      } catch {
        // transient, next tick retries
      }
    }, POLL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id, job?.status, connectionId])

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      if (czErrorStatus(error) === 401) {
        auth.reload()
      }
      message.error(await czErrorMessage(error, fallback))
      if (job) {
        chestnyZnakApi.getJob(connectionId, job.id).then(updateJob).catch(() => undefined)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = () =>
    run(async () => {
      if (!draft) return
      let extra: Partial<CzJobCreate> = { introduce }
      if (introduce) {
        const values = await form.validateFields()
        extra = {
          introduce,
          ...(perProductDocuments
            ? productionDateFromValues(values)
            : certificateFromValues(values)),
        }
      }
      updateJob(await chestnyZnakApi.createJob(connectionId, draftPayload(draft, extra)))
    }, 'Ошибка создания задания')

  const handleSign = () =>
    run(async () => {
      if (!job) return
      const unsigned = job.environment === 'sandbox' && getSandboxUnsigned()
      const thumbprint = getSavedThumbprint()
      if (!unsigned && !thumbprint) throw new Error('Сначала войдите в Честный знак по ЭЦП')
      const signatures = []
      for (const pending of job.pending_signatures) {
        signatures.push({
          key: pending.key,
          signature: unsigned ? '' : await signBase64(thumbprint!, pending.body_b64, true),
        })
      }
      updateJob(await chestnyZnakApi.submitSignatures(connectionId, job.id, job.status, signatures))
    }, 'Ошибка подписи')

  const handleCancel = () =>
    run(async () => {
      if (!job) return
      await chestnyZnakApi.cancelJob(connectionId, job.id)
      message.success('Задание отменено')
      onClose()
    }, 'Ошибка отмены')

  const handleIntroduce = () =>
    run(async () => {
      if (!job) return
      const values = await form.validateFields()
      updateJob(await chestnyZnakApi.introduce(connectionId, job.id, certificateFromValues(values)))
    }, 'Ошибка')

  const handleRetry = (withCertificate: boolean) =>
    run(async () => {
      if (!job) return
      const data = withCertificate ? certificateFromValues(await form.validateFields()) : undefined
      updateJob(await chestnyZnakApi.retry(connectionId, job.id, data))
    }, 'Ошибка повтора')

  const handleDownload = () =>
    run(async () => {
      if (!job) return
      const { blob, filename } = await chestnyZnakApi.downloadLabels(
        connectionId,
        job.id,
        undefined,
        job.labels_filename
      )
      downloadBlob(blob, filename)
    }, 'Ошибка скачивания PDF')

  const cost = useMemo(() => {
    if (!job || !auth.status) return null
    return job.total_quantity * auth.status.code_price_rub
  }, [job, auth.status])

  const authorized = !!auth.status?.authorized
  const authPanel = (
    <CzAuthPanel
      connectionId={connectionId}
      status={auth.status}
      loading={auth.loading}
      onStatusChange={auth.setStatus}
      onReload={auth.reload}
    />
  )

  const certificateSummary = job?.certificate_number
    ? `${job.certificate_type ? CZ_CERTIFICATE_TYPE_LABELS[job.certificate_type] : ''} № ${job.certificate_number} от ${formatDate(job.certificate_date)}, дата производства ${formatDate(job.production_date)}`
    : null

  const itemsTable = job && (
    <Table
      size="small"
      pagination={false}
      scroll={{ y: 240 }}
      rowKey={(r) => `${r.supply_id ?? ''}-${r.offer_id}`}
      dataSource={job.items}
      columns={[
        ...(job.source === 'SUPPLIES'
          ? [{ title: 'Поставка', dataIndex: 'supply_id', width: 120 }]
          : []),
        { title: 'Артикул', dataIndex: 'offer_id' },
        { title: 'GTIN', dataIndex: 'gtin', width: 140 },
        { title: 'Кол-во', dataIndex: 'quantity', width: 80 },
      ]}
    />
  )

  const downloadButton = job && job.codes_count > 0 && (
    <Button icon={<DownloadOutlined />} onClick={handleDownload} loading={busy}>
      Скачать этикетки PDF ({job.codes_count})
    </Button>
  )

  const renderJob = (job: CzJob) => {
    const status = job.status
    const signButton = (label: string) => (
      <Space orientation="vertical" style={{ width: '100%' }}>
        {!authorized && authPanel}
        <Button type="primary" size="large" loading={busy} disabled={!authorized} onClick={handleSign}>
          {label}
        </Button>
      </Space>
    )

    switch (status) {
      case 'AWAIT_ORDER_SIGNATURE':
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              type={job.environment === 'prod' ? 'warning' : 'info'}
              showIcon
              title={`Будет заказано кодов: ${job.total_quantity}${cost != null ? `, ≈ ${cost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽` : ''}`}
              description={
                job.environment === 'prod'
                  ? 'Стоимость кодов списывается с баланса личного кабинета Честного знака и не возвращается.'
                  : 'Песочница: коды тестовые, деньги не списываются.'
              }
            />
            {itemsTable}
            {signButton('Подписать и заказать коды')}
            <Button type="link" danger onClick={handleCancel} disabled={busy}>
              Отменить задание (коды ещё не заказаны)
            </Button>
          </Space>
        )
      case 'ORDERING':
      case 'APPLYING':
      case 'INTRODUCING':
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Space>
              <Spin />
              <Typography.Text>
                {status === 'ORDERING' &&
                  `СУЗ выпускает коды: получено ${job.codes_count} из ${job.total_quantity}`}
                {status === 'APPLYING' &&
                  `Ждём, пока ГИС МТ переведёт коды в статус «Нанесён»: ${job.codes_by_status.APPLIED ?? 0} из ${job.codes_count}`}
                {status === 'INTRODUCING' && 'ГИС МТ обрабатывает документ ввода в оборот'}
              </Typography.Text>
            </Space>
            <Typography.Text type="secondary">
              Можно закрыть окно — задание продолжится, вернуться к нему можно на странице «Задания ЧЗ».
            </Typography.Text>
            {downloadButton}
          </Space>
        )
      case 'CODES_READY':
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              type="success"
              showIcon
              title={`Коды получены: ${job.codes_count}`}
              description="Коды заказаны, но не введены в оборот. Их можно ввести в оборот позже."
            />
            {downloadButton}
            <Collapse
              items={[
                {
                  key: 'introduce',
                  label: 'Ввести эти коды в оборот',
                  children: (
                    <Form form={form} layout="vertical">
                      <CzCertificateFields />
                      <Button type="primary" loading={busy} onClick={handleIntroduce}>
                        Продолжить: нанесение и ввод в оборот
                      </Button>
                    </Form>
                  ),
                },
              ]}
            />
          </Space>
        )
      case 'AWAIT_UTILISATION_SIGNATURE':
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Typography.Paragraph>
              Коды получены ({job.codes_count}). Следующий шаг — подписать «отчёт о нанесении»:
              он сообщает Честному знаку, что коды напечатаны и будут нанесены на товар.
            </Typography.Paragraph>
            {downloadButton}
            {signButton('Подписать отчёт о нанесении')}
          </Space>
        )
      case 'AWAIT_INTRODUCE_SIGNATURE':
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Typography.Paragraph>
              Коды нанесены. Подпишите документ «Ввод в оборот. Производство РФ».
              {certificateSummary && (
                <>
                  <br />
                  <Typography.Text type="secondary">{certificateSummary}</Typography.Text>
                </>
              )}
            </Typography.Paragraph>
            {downloadButton}
            {signButton('Подписать ввод в оборот')}
          </Space>
        )
      case 'DONE':
        return (
          <Result
            status="success"
            title={`Коды введены в оборот: ${job.codes_count}`}
            extra={downloadButton}
          />
        )
      case 'FAILED': {
        const fixCertificate = job.failed_status === 'AWAIT_INTRODUCE_SIGNATURE'
        return (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Alert
              type="error"
              showIcon
              title={`Ошибка на шаге «${job.failed_status ? CZ_JOB_STATUS_LABELS[job.failed_status] : ''}»`}
              description={job.error}
            />
            {!authorized && authPanel}
            {fixCertificate && (
              <Form form={form} layout="vertical">
                <Typography.Paragraph type="secondary">
                  При необходимости исправьте документ соответствия (и ТН ВЭД на странице GTIN) и
                  повторите — документ будет сформирован заново.
                </Typography.Paragraph>
                <CzCertificateFields />
              </Form>
            )}
            <Space>
              <Button
                type="primary"
                loading={busy}
                disabled={!authorized}
                onClick={() => handleRetry(fixCertificate)}
              >
                Повторить
              </Button>
              {downloadButton}
            </Space>
          </Space>
        )
      }
    }
  }

  const docsKind = preview ? documentsKind(preview.items, preview.certificate) : null
  const perProductDocuments = docsKind === 'per_product'
  const documentsNote = preview && introduce && (
    <>
      {docsKind === 'common' && (
        <Alert
          type="info"
          showIcon
          title="Документ соответствия подставлен со страницы «GTIN товаров»"
          description="Проверьте его. Если изменить — для этого задания будет использован изменённый документ."
        />
      )}
      {docsKind === 'per_product' && (
        <Alert
          type="info"
          showIcon
          title="У товаров разные документы соответствия — каждый возьмётся со страницы «GTIN товаров»"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {[...new Map(preview.items.map((i) => [i.offer_id, i])).values()].map((i) => (
                <li key={i.offer_id}>
                  {i.offer_id}:{' '}
                  {i.certificate_type ? CZ_CERTIFICATE_TYPE_LABELS[i.certificate_type] : ''} №{' '}
                  {i.certificate_number} от {formatDate(i.certificate_date)}
                </li>
              ))}
            </ul>
          }
        />
      )}
      {docsKind === 'incomplete' && preview.items.some((i) => i.certificate_number) && (
        <Alert
          type="warning"
          showIcon
          title="Не у всех товаров указан документ соответствия на странице «GTIN товаров»"
          description="Указанный здесь документ будет использован для всех товаров задания."
        />
      )}
    </>
  )

  const steps = job?.introduce ?? introduce
    ? ['Заказ кодов', 'Получение кодов', 'Нанесение', 'Ввод в оборот', 'Готово']
    : ['Заказ кодов', 'Получение кодов', 'Коды получены']

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      title={
        <Space>
          {job ? `Коды Честного знака — задание ${job.id}` : draft?.title ?? 'Коды Честного знака'}
          <CzEnvBadge environment={job?.environment ?? auth.status?.environment} />
        </Space>
      }
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {(job || draft) && (
          <Steps
            size="small"
            current={job ? stepIndex(job.status, job.introduce) : 0}
            status={job?.status === 'FAILED' ? 'error' : undefined}
            items={steps.map((title) => ({ title }))}
          />
        )}

        {!job && draft && (
          <Space orientation="vertical" style={{ width: '100%' }}>
            {authPanel}
            <Checkbox checked={introduce} onChange={(e) => setIntroduce(e.target.checked)}>
              Ввести коды в оборот (отчёт о нанесении + ввод в оборот)
            </Checkbox>
            {introduce && (
              <Spin spinning={previewLoading}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  {documentsNote}
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={certificateInitialValues(preview?.certificate)}
                  >
                    <CzCertificateFields withDocument={!perProductDocuments} />
                  </Form>
                </Space>
              </Spin>
            )}
            <Button
              type="primary"
              size="large"
              loading={busy}
              disabled={!authorized || previewLoading}
              onClick={handleCreate}
            >
              Далее: проверить состав и стоимость
            </Button>
          </Space>
        )}

        {!job && !draft && jobId && <Spin />}

        {job && renderJob(job)}

        {job && job.events.length > 0 && (
          <Collapse
            size="small"
            items={[
              {
                key: 'events',
                label: 'Журнал обмена с Честным знаком',
                children: (
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    {[...job.events].reverse().map((e, i) => (
                      <div key={i}>
                        <Tag color={e.ok ? 'green' : 'red'}>{e.action}</Tag>
                        <Typography.Text type="secondary">{formatDateTime(e.at)}</Typography.Text>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, margin: '4px 0 0' }}>
                          {e.detail}
                        </pre>
                      </div>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Space>
    </Modal>
  )
}

export default CzMarkingJobModal
