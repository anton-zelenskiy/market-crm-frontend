import React, { useEffect, useState } from 'react'
import { Modal, Progress, Typography, Space } from 'antd'
import type { ProgressData } from '../api/supplies'
import { suppliesApi } from '../api/supplies'

const { Text } = Typography

interface ProgressModalProps {
  visible: boolean
  snapshotId: number
  taskId: string
  onComplete: () => void
  onCancel: () => void
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  visible,
  snapshotId,
  taskId,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState<ProgressData>({
    status: 'pending',
    stage: 'initializing',
    progress: 0,
    message: 'Инициализация...',
  })

  useEffect(() => {
    if (!visible || !taskId) return

    const eventSource = suppliesApi.getSnapshotProgress(snapshotId, taskId)

    const handleProgress = (event: MessageEvent) => {
      try {
        const data: ProgressData = JSON.parse(event.data)
        setProgress(data)

        if (data.status === 'completed') {
          eventSource.close()
          setTimeout(() => {
            onComplete()
          }, 500)
        } else if (data.status === 'failed') {
          eventSource.close()
        }
      } catch (error) {
        console.error('Error parsing progress data:', error)
      }
    }

    const handleError = (event: MessageEvent) => {
      try {
        const data: ProgressData = JSON.parse(event.data)
        setProgress(data)
        if (data.status === 'error' || data.status === 'failed') {
          eventSource.close()
        }
      } catch (error) {
        console.error('Error parsing error data:', error)
      }
    }

    const handleCompleted = () => {
      eventSource.close()
      onComplete()
    }

    const handleFailed = () => {
      eventSource.close()
    }

    eventSource.addEventListener('progress', handleProgress)
    eventSource.addEventListener('completed', handleCompleted)
    eventSource.addEventListener('failed', handleFailed)
    eventSource.addEventListener('error', handleError)

    return () => {
      eventSource.close()
    }
  }, [visible, snapshotId, taskId, onComplete])

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      initializing: 'Инициализация',
      creating_draft: 'Создание черновика',
      polling_draft: 'Ожидание обработки черновика',
      fetching_bundles: 'Получение данных о складах',
      calculating: 'Расчет данных',
      completed: 'Завершено',
      failed: 'Ошибка',
    }
    return labels[stage] || stage
  }

  return (
    <Modal
      title="Создание шаблона"
      open={visible}
      onCancel={onCancel}
      footer={null}
      closable={progress.status === 'completed' || progress.status === 'failed'}
      maskClosable={false}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>{getStageLabel(progress.stage)}</Text>
          {progress.message && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{progress.message}</Text>
            </div>
          )}
        </div>
        <Progress
          percent={progress.progress}
          status={
            progress.status === 'failed' || progress.status === 'error'
              ? 'exception'
              : progress.status === 'completed'
              ? 'success'
              : 'active'
          }
        />
        {progress.error && (
          <Text type="danger">{progress.error}</Text>
        )}
      </Space>
    </Modal>
  )
}
