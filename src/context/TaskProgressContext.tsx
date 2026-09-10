import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { message } from 'antd'

import type { ProgressData } from '../api/supplies'
import { openProgressStream, type ProgressEventSource } from '../api/progressStream'
import {
  TASK_PROGRESS_MAX_AGE_MS,
  TASK_PROGRESS_STORAGE_KEY,
  TASK_KIND_TITLE,
  isTerminal,
  type TaskKind,
  type TaskStatus,
} from '../constants/taskProgress'
import { useAuth } from './AuthContext'

export interface TaskDescriptor {
  /** Backend task_id (uuid) — the primary key. */
  taskId: string
  kind: TaskKind
  title: string
  /** Full SSE URL, built by the caller and persisted so a reload can reconnect. */
  progressUrl: string
  /** Kind-specific, JSON-serialisable data (snapshotId, connectionId, ...). */
  context?: Record<string, unknown>
  startedAt: number
  status: TaskStatus
  stage: string
  progress: number
  message?: string
  error?: string
  /** Client-only: true between opening the stream and the first event. */
  reconnecting?: boolean
}

type PersistedTask = Omit<TaskDescriptor, 'reconnecting'>

export interface StartTaskInput {
  taskId: string
  kind: TaskKind
  title?: string
  progressUrl: string
  context?: Record<string, unknown>
}

export interface CompletionFilter {
  kind?: TaskKind
  taskId?: string
  contextMatch?: Record<string, unknown>
}

interface CompletionListener {
  filter: CompletionFilter
  handler: (t: TaskDescriptor) => void
}

interface TaskProgressContextValue {
  tasks: TaskDescriptor[]
  startTask: (input: StartTaskInput) => void
  dismissTask: (taskId: string) => void
  retryTask: (taskId: string) => void
  /** Internal: used by `useTaskCompletion`. Returns an unsubscribe fn. */
  _subscribeCompletion: (listener: CompletionListener) => () => void
}

const TaskProgressContext = createContext<TaskProgressContextValue | undefined>(
  undefined
)

const now = () => Date.now()

function loadFromStorage(): TaskDescriptor[] {
  try {
    const raw = localStorage.getItem(TASK_PROGRESS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersistedTask[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((t) => t && typeof t.taskId === 'string' && typeof t.progressUrl === 'string')
      .filter((t) => now() - (t.startedAt ?? 0) < TASK_PROGRESS_MAX_AGE_MS)
      // Keep unfinished tasks (reconnect) and failed/error ones (actionable);
      // drop completed/expired — their side effects already ran and pages
      // reload their own data on mount.
      .filter((t) => !['completed', 'expired'].includes(t.status))
      .map((t) => ({ ...t, reconnecting: false }))
      .sort((a, b) => a.startedAt - b.startedAt)
  } catch {
    return []
  }
}

function persist(tasks: TaskDescriptor[]) {
  try {
    const toStore: PersistedTask[] = tasks.map((t) => ({
      taskId: t.taskId,
      kind: t.kind,
      title: t.title,
      progressUrl: t.progressUrl,
      context: t.context,
      startedAt: t.startedAt,
      status: t.status,
      stage: t.stage,
      progress: t.progress,
      message: t.message,
      error: t.error,
    }))
    localStorage.setItem(TASK_PROGRESS_STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    /* storage unavailable — progress just won't survive a reload */
  }
}

function safeParse(data: unknown): Record<string, unknown> {
  if (typeof data !== 'string') {
    return (data as Record<string, unknown>) ?? {}
  }
  try {
    return JSON.parse(data) as Record<string, unknown>
  } catch {
    return {}
  }
}

function matchesFilter(task: TaskDescriptor, filter: CompletionFilter): boolean {
  if (filter.kind !== undefined && task.kind !== filter.kind) return false
  if (filter.taskId !== undefined && task.taskId !== filter.taskId) return false
  if (filter.contextMatch) {
    for (const [key, value] of Object.entries(filter.contextMatch)) {
      if (task.context?.[key] !== value) return false
    }
  }
  return true
}

export const TaskProgressProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth()
  const [tasks, setTasks] = useState<TaskDescriptor[]>(() => loadFromStorage())

  const tasksRef = useRef<TaskDescriptor[]>(tasks)
  const sseRefs = useRef<Map<string, ProgressEventSource>>(new Map())
  const firedRef = useRef<Set<string>>(new Set())
  const listenersRef = useRef<Set<CompletionListener>>(new Set())

  const subscribeCompletion = useCallback((listener: CompletionListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const patchTask = useCallback(
    (taskId: string, partial: Partial<TaskDescriptor>) => {
      // Keep the ref in sync synchronously so a fireCompletion() called right
      // after a terminal patch sees the final status, not the pre-render one.
      tasksRef.current = tasksRef.current.map((t) =>
        t.taskId === taskId ? { ...t, ...partial } : t
      )
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.taskId === taskId ? { ...t, ...partial } : t
        )
        persist(next)
        return next
      })
    },
    []
  )

  const closeSse = useCallback((taskId: string) => {
    const es = sseRefs.current.get(taskId)
    if (es) {
      es.close()
      sseRefs.current.delete(taskId)
    }
  }, [])

  const fireCompletion = useCallback(
    (taskId: string, overrides?: Partial<TaskDescriptor>) => {
      if (firedRef.current.has(taskId)) return
      firedRef.current.add(taskId)
      const base = tasksRef.current.find((t) => t.taskId === taskId)
      if (!base) return
      const task: TaskDescriptor = { ...base, ...overrides }

      let handled = false
      for (const listener of listenersRef.current) {
        if (matchesFilter(task, listener.filter)) {
          handled = true
          try {
            listener.handler(task)
          } catch (e) {
            console.error('Task completion handler failed', e)
          }
        }
      }

      if (!handled) {
        if (task.status === 'completed') {
          message.success(`${task.title}: готово`)
        } else if (task.status !== 'expired') {
          message.error(task.error || task.message || `${task.title}: ошибка`)
        }
      }
    },
    []
  )

  const openSse = useCallback(
    (task: TaskDescriptor) => {
      if (sseRefs.current.has(task.taskId)) return
      const es = openProgressStream(task.progressUrl)
      sseRefs.current.set(task.taskId, es)
      patchTask(task.taskId, { reconnecting: true })

      const onProgress = (event: Event) => {
        const data = safeParse((event as MessageEvent).data) as Partial<ProgressData>
        patchTask(task.taskId, {
          status: (data.status as TaskStatus) ?? 'running',
          stage: data.stage ?? task.stage,
          progress: typeof data.progress === 'number' ? data.progress : task.progress,
          message: data.message,
          error: data.error,
          reconnecting: false,
        })
      }

      const onTerminal = (status: TaskStatus) => (event: Event) => {
        const data = safeParse((event as MessageEvent).data) as Partial<ProgressData>
        const patch: Partial<TaskDescriptor> = {
          status,
          stage: data.stage ?? status,
          progress: status === 'completed' ? 100 : (data.progress ?? task.progress),
          message: data.message,
          error: data.error,
          reconnecting: false,
        }
        patchTask(task.taskId, patch)
        closeSse(task.taskId)
        fireCompletion(task.taskId, patch)
      }

      const onError = (event: Event) => {
        const data = safeParse((event as MessageEvent).data)
        const httpStatus = data.httpStatus as number | null | undefined
        const msg =
          httpStatus === 401
            ? 'Сессия истекла, войдите снова'
            : (data.error as string) || 'Ошибка соединения'
        const patch: Partial<TaskDescriptor> = {
          status: 'error',
          stage: 'error',
          message: msg,
          error: msg,
          reconnecting: false,
        }
        patchTask(task.taskId, patch)
        closeSse(task.taskId)
        fireCompletion(task.taskId, patch)
      }

      const onEnd = () => {
        const current = tasksRef.current.find((t) => t.taskId === task.taskId)
        if (current && !isTerminal(current.status)) {
          const patch: Partial<TaskDescriptor> = {
            status: 'expired',
            progress: 100,
            reconnecting: false,
          }
          patchTask(task.taskId, patch)
          closeSse(task.taskId)
          fireCompletion(task.taskId, patch)
        }
      }

      es.addEventListener('progress', onProgress)
      es.addEventListener('completed', onTerminal('completed'))
      es.addEventListener('failed', onTerminal('failed'))
      es.addEventListener('expired', onTerminal('expired'))
      es.addEventListener('error', onError)
      es.addEventListener('end', onEnd)
    },
    [patchTask, closeSse, fireCompletion]
  )

  const startTask = useCallback(
    (input: StartTaskInput) => {
      if (tasksRef.current.some((t) => t.taskId === input.taskId)) return
      const task: TaskDescriptor = {
        taskId: input.taskId,
        kind: input.kind,
        title: input.title ?? TASK_KIND_TITLE[input.kind] ?? 'Фоновая задача',
        progressUrl: input.progressUrl,
        context: input.context,
        startedAt: now(),
        status: 'pending',
        stage: 'initializing',
        progress: 0,
        message: 'Задача поставлена в очередь...',
        reconnecting: true,
      }
      firedRef.current.delete(input.taskId)
      setTasks((prev) => {
        const next = [...prev, task]
        persist(next)
        return next
      })
      tasksRef.current = [...tasksRef.current, task]
      openSse(task)
    },
    [openSse]
  )

  const dismissTask = useCallback(
    (taskId: string) => {
      closeSse(taskId)
      firedRef.current.delete(taskId)
      setTasks((prev) => {
        const next = prev.filter((t) => t.taskId !== taskId)
        persist(next)
        return next
      })
    },
    [closeSse]
  )

  const retryTask = useCallback(
    (taskId: string) => {
      const task = tasksRef.current.find((t) => t.taskId === taskId)
      if (!task) return
      firedRef.current.delete(taskId)
      closeSse(taskId)
      patchTask(taskId, {
        status: 'running',
        stage: 'initializing',
        message: 'Переподключение...',
        error: undefined,
        reconnecting: true,
      })
      openSse({ ...task, status: 'running' })
    },
    [closeSse, patchTask, openSse]
  )

  // Reconnect rehydrated / auth-restored tasks; reset everything on logout.
  useEffect(() => {
    if (isAuthenticated && localStorage.getItem('access_token')) {
      for (const task of tasksRef.current) {
        if (!isTerminal(task.status) && !sseRefs.current.has(task.taskId)) {
          openSse(task)
        }
      }
      return
    }
    if (!isAuthenticated) {
      for (const es of sseRefs.current.values()) es.close()
      sseRefs.current.clear()
      firedRef.current.clear()
      setTasks([])
      try {
        localStorage.removeItem(TASK_PROGRESS_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
  }, [isAuthenticated, openSse])

  // Close every stream when the provider unmounts.
  useEffect(() => {
    const refs = sseRefs.current
    return () => {
      for (const es of refs.values()) es.close()
      refs.clear()
    }
  }, [])

  const value: TaskProgressContextValue = {
    tasks,
    startTask,
    dismissTask,
    retryTask,
    _subscribeCompletion: subscribeCompletion,
  }

  return (
    <TaskProgressContext.Provider value={value}>
      {children}
    </TaskProgressContext.Provider>
  )
}

export const useTaskProgress = (): TaskProgressContextValue => {
  const ctx = useContext(TaskProgressContext)
  if (!ctx) {
    throw new Error('useTaskProgress must be used within a TaskProgressProvider')
  }
  return ctx
}

/**
 * Run `handler` when a background task matching `filter` reaches a terminal
 * state (`completed` / `failed` / `error` / `expired`). Handlers are not
 * persisted, so a task that finished while the subscriber was unmounted (e.g.
 * the user navigated away) is handled by the provider's fallback toast instead.
 */
export function useTaskCompletion(
  filter: CompletionFilter,
  handler: (task: TaskDescriptor) => void
): void {
  const ctx = useContext(TaskProgressContext)
  if (!ctx) {
    throw new Error('useTaskCompletion must be used within a TaskProgressProvider')
  }
  const { _subscribeCompletion } = ctx

  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  const filterKey = JSON.stringify(filter)
  useEffect(() => {
    const parsedFilter: CompletionFilter = JSON.parse(filterKey)
    return _subscribeCompletion({
      filter: parsedFilter,
      handler: (t) => handlerRef.current(t),
    })
    // filterKey is the serialized filter; re-subscribe only when it changes.
  }, [filterKey, _subscribeCompletion])
}
