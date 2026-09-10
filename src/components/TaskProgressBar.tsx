import React, { useState } from 'react'
import { Button, Grid, message, theme, Typography } from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

import { useTaskProgress } from '../context/TaskProgressContext'
import { TASK_PROGRESS_BAR_COLLAPSED_KEY } from '../constants/taskProgress'
import { suppliesApi } from '../api/supplies'
import { downloadBlob } from '../lib/downloadBlob'
import { TaskProgressRow } from './TaskProgressRow'

const { Text } = Typography

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(TASK_PROGRESS_BAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export const TaskProgressBar: React.FC = () => {
  const { tasks, dismissTask, retryTask } = useTaskProgress()
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const {
    token: { colorBgContainer, colorBorderSecondary },
  } = theme.useToken()
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)

  if (tasks.length === 0) return null

  const isMobile = !screens.md
  const runningCount = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'running'
  ).length

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(TASK_PROGRESS_BAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: colorBgContainer,
        borderTop: `1px solid ${colorBorderSecondary}`,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
        padding: isMobile ? '6px 8px' : '8px 16px',
        maxHeight: '40vh',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Фоновые задачи{runningCount > 0 ? ` · выполняется ${runningCount}` : ''}
        </Text>
        <Button
          type="text"
          size="small"
          icon={collapsed ? <UpOutlined /> : <DownOutlined />}
          onClick={toggleCollapsed}
        />
      </div>

      {!collapsed && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 6,
          }}
        >
          {tasks.map((task) => {
            const connectionId = task.context?.connectionId
            const snapshotId = task.context?.snapshotId
            const onOpenSnapshot =
              typeof connectionId === 'number' && typeof snapshotId === 'number'
                ? () =>
                    navigate(
                      `/connections/${connectionId}/supply-templates/${snapshotId}`
                    )
                : undefined

            const download = task.context?.download as
              | { filename?: string }
              | undefined
            const onDownloadResult =
              download?.filename && task.status === 'completed'
                ? async () => {
                    try {
                      const blob = await suppliesApi.getTaskResult(task.taskId)
                      downloadBlob(blob, download.filename as string)
                    } catch (e) {
                      const status = (
                        e as { response?: { status?: number } }
                      )?.response?.status
                      message.error(
                        status === 404
                          ? 'Результат недоступен или устарел'
                          : 'Ошибка скачивания результата'
                      )
                    }
                  }
                : undefined

            return (
              <TaskProgressRow
                key={task.taskId}
                task={task}
                onDismiss={() => dismissTask(task.taskId)}
                onRetry={() => retryTask(task.taskId)}
                onOpenSnapshot={onOpenSnapshot}
                onDownloadResult={onDownloadResult}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
