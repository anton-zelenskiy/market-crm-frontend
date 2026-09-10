import React, { useEffect, useRef } from 'react'
import { Button, Progress, Tag, Tooltip, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

import type { TaskDescriptor } from '../context/TaskProgressContext'
import { getStageLabel } from '../constants/taskProgress'

const { Text } = Typography

const AUTO_DISMISS_MS = 60000

interface TaskProgressRowProps {
  task: TaskDescriptor
  onDismiss: () => void
  onRetry: () => void
  onOpenSnapshot?: () => void
  onDownloadResult?: () => void
}

const mapProgressStatus = (
  status: TaskDescriptor['status']
): 'active' | 'success' | 'exception' | 'normal' => {
  if (status === 'failed' || status === 'error') return 'exception'
  if (status === 'completed') return 'success'
  if (status === 'expired') return 'normal'
  return 'active'
}

export const TaskProgressRow: React.FC<TaskProgressRowProps> = ({
  task,
  onDismiss,
  onRetry,
  onOpenSnapshot,
  onDownloadResult,
}) => {
  const hoveringRef = useRef(false)

  // Auto-dismiss a successful row after a short delay (unless hovered).
  // Rows with a downloadable result stay until the user closes them so the
  // "Скачать" button remains reachable.
  useEffect(() => {
    if (task.status !== 'completed' || onDownloadResult) return
    const timer = window.setTimeout(() => {
      if (!hoveringRef.current) onDismiss()
    }, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [task.status, onDismiss, onDownloadResult])

  const canRetry = task.status === 'error' || task.status === 'expired'
  const showOpenSnapshot =
    task.kind === 'create_snapshot' &&
    task.status === 'completed' &&
    !!onOpenSnapshot

  return (
    <div
      onMouseEnter={() => {
        hoveringRef.current = true
      }}
      onMouseLeave={() => {
        hoveringRef.current = false
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <Text strong style={{ whiteSpace: 'nowrap' }}>
        {task.title}
      </Text>

      <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
        {getStageLabel(task.stage)}
      </Text>

      {task.reconnecting && <Tag>переподключение…</Tag>}

      <Progress
        percent={Math.round(task.progress)}
        size="small"
        status={mapProgressStatus(task.status)}
        style={{ flex: 1, minWidth: 140, marginBottom: 0 }}
      />

      {showOpenSnapshot && (
        <Button type="link" size="small" onClick={onOpenSnapshot}>
          Открыть шаблон
        </Button>
      )}

      {onDownloadResult && task.status === 'completed' && (
        <Button type="link" size="small" onClick={onDownloadResult}>
          Скачать
        </Button>
      )}

      {canRetry && (
        <Button type="link" size="small" onClick={onRetry}>
          Повторить
        </Button>
      )}

      <Tooltip title="Скрыть">
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onDismiss}
        />
      </Tooltip>

      {task.error && (
        <Text type="danger" style={{ flexBasis: '100%', fontSize: 12 }}>
          {task.error}
        </Text>
      )}
      {!task.error && task.message && task.status !== 'completed' && (
        <Text
          type="secondary"
          style={{ flexBasis: '100%', fontSize: 12 }}
          ellipsis
        >
          {task.message}
        </Text>
      )}
    </div>
  )
}
