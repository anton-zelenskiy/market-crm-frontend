import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Space, Table, Tag, Typography, message } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  CZ_JOB_STATUS_LABELS,
  CZ_POLLED_STATUSES,
  CZ_SIGNATURE_STATUSES,
  chestnyZnakApi,
  czErrorMessage,
  type CzJob,
  type CzJobStatus,
} from '../api/chestnyZnak'
import { downloadBlob } from '../lib/downloadBlob'
import { formatDateTime } from '../lib/dayjs'
import CzBreadcrumb from '../components/chestnyZnak/CzBreadcrumb'
import CzEnvBadge from '../components/chestnyZnak/CzEnvBadge'
import CzMarkingJobModal from '../components/chestnyZnak/CzMarkingJobModal'

function czJobStatusColor(status: CzJobStatus): string {
  if (status === 'DONE') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'CODES_READY') return 'cyan'
  if (CZ_SIGNATURE_STATUSES.includes(status)) return 'warning'
  if (CZ_POLLED_STATUSES.includes(status)) return 'processing'
  return 'default'
}

const ChestnyZnakJobs: React.FC = () => {
  const { connectionId: connectionIdParam } = useParams<{ connectionId: string }>()
  const connectionId = Number(connectionIdParam)
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<CzJob[]>([])
  const [loading, setLoading] = useState(false)
  const [openJobId, setOpenJobId] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setJobs(await chestnyZnakApi.listJobs(connectionId))
    } catch (e) {
      message.error(await czErrorMessage(e, 'Ошибка загрузки заданий'))
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => {
    load()
  }, [load])

  const download = async (job: CzJob) => {
    setDownloading(job.id)
    try {
      const { blob, filename } = await chestnyZnakApi.downloadLabels(
        connectionId,
        job.id,
        undefined,
        job.labels_filename
      )
      downloadBlob(blob, filename)
    } catch (e) {
      message.error(await czErrorMessage(e, 'Ошибка скачивания PDF'))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div className="crm-split-header">
          <div className="crm-split-header__start">
            <CzBreadcrumb connectionId={connectionId} title="Задания" />
          </div>
          <div className="crm-split-header__end">
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Обновить
            </Button>
            <Button
              type="primary"
              onClick={() => navigate(`/connections/${connectionId}/chestny-znak/generate`)}
            >
              Генерация кодов
            </Button>
          </div>
        </div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Задания Честного знака
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          Незавершённые задания нужно довести до конца: коды уже оплачены.
        </Typography.Paragraph>

        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={jobs}
          pagination={{ pageSize: 50 }}
          columns={[
            { title: '№', dataIndex: 'id', width: 70 },
            {
              title: 'Создано',
              dataIndex: 'created_at',
              width: 140,
              render: (v: string) => formatDateTime(v),
            },
            {
              title: 'Контур',
              dataIndex: 'environment',
              width: 120,
              render: (env) => <CzEnvBadge environment={env} />,
            },
            {
              title: 'Источник',
              width: 220,
              render: (_, job: CzJob) =>
                job.source === 'SUPPLIES'
                  ? `Поставки: ${job.supplies.map((s) => s.supply_id).join(', ')}`
                  : `Вручную: ${job.items.map((i) => i.offer_id).join(', ')}`,
            },
            {
              title: 'Кодов',
              width: 100,
              render: (_, job: CzJob) => `${job.codes_count} / ${job.total_quantity}`,
            },
            {
              title: 'Статус',
              width: 260,
              render: (_, job: CzJob) => (
                <Space orientation="vertical" size={0}>
                  <Tag color={czJobStatusColor(job.status)}>{CZ_JOB_STATUS_LABELS[job.status]}</Tag>
                  {job.error && (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      {job.error}
                    </Typography.Text>
                  )}
                </Space>
              ),
            },
            {
              title: 'Действия',
              width: 240,
              render: (_, job: CzJob) => (
                <Space>
                  <Button size="small" onClick={() => setOpenJobId(job.id)}>
                    {job.status === 'DONE' ? 'Открыть' : 'Продолжить'}
                  </Button>
                  {job.codes_count > 0 && (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={downloading === job.id}
                      onClick={() => download(job)}
                    >
                      PDF
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <CzMarkingJobModal
        open={openJobId != null}
        connectionId={connectionId}
        jobId={openJobId}
        onClose={() => {
          setOpenJobId(null)
          load()
        }}
      />
    </Card>
  )
}

export default ChestnyZnakJobs
