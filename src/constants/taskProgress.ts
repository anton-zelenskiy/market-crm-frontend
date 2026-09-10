import type { ProgressData } from '../api/supplies'

/**
 * localStorage key holding the list of tracked background tasks so the bottom
 * progress bar can rebuild itself and reconnect its SSE streams after a full
 * page reload.
 */
export const TASK_PROGRESS_STORAGE_KEY = 'crm.taskProgress.v1'

/** localStorage key for the "bar is collapsed" preference. */
export const TASK_PROGRESS_BAR_COLLAPSED_KEY = 'crm.taskProgress.barCollapsed'

/**
 * Drop persisted tasks older than this on rehydrate. Matches the backend
 * PROGRESS_TTL (1 hour) after which the SSE stream can only answer `expired`.
 */
export const TASK_PROGRESS_MAX_AGE_MS = 60 * 60 * 1000

/**
 * Task kinds are free-form strings so a new background action only needs a
 * `startTask({ kind: '...' })` call — nothing in the provider or the bar has to
 * change. These are the ones wired today.
 */
export type TaskKind = string

export const KNOWN_TASK_KINDS = [
  'create_snapshot',
  'refresh_snapshot',
  'bulk_supply',
  'kaiten_bulk',
  'bulk_cargoes',
  'bulk_documents',
  'bulk_cargo_labels',
] as const

/** Fallback display titles; callers still pass an explicit `title` to startTask. */
export const TASK_KIND_TITLE: Partial<Record<string, string>> = {
  create_snapshot: 'Создание шаблона',
  refresh_snapshot: 'Обновление шаблона',
  bulk_supply: 'Создание поставок',
  kaiten_bulk: 'Создание карточек Kaiten',
  bulk_cargoes: 'Генерация грузомест',
  bulk_documents: 'Комплект документов',
  bulk_cargo_labels: 'Ярлыки грузомест',
}

const STAGE_LABELS: Record<string, string> = {
  initializing: 'Инициализация',
  metrics: 'Загрузка данных для расчета поставки',
  creating_draft: 'Создание черновика',
  fetching_bundles: 'Получение данных о доступности кластеров',
  calculating: 'Расчет количества товаров к поставке',
  calculating_supply: 'Расчет количества товаров к поставке',
  planning: 'Формирование плана создания поставок',
  creating_supplies: 'Создание поставок',
  creating_cards: 'Создание задач в Kaiten',
  cargoes: 'Генерация грузомест',
  documents: 'Формирование документов',
  labels: 'Формирование ярлыков',
  packing: 'Упаковка архива',
  completed: 'Завершено',
  failed: 'Ошибка',
  expired: 'Статус недоступен',
  error: 'Ошибка соединения',
}

export const getStageLabel = (stage: string): string =>
  STAGE_LABELS[stage] ?? stage

export type TaskStatus = ProgressData['status']

const TERMINAL_STATUSES: readonly TaskStatus[] = [
  'completed',
  'failed',
  'error',
  'expired',
]

export const isTerminal = (status: string): boolean =>
  (TERMINAL_STATUSES as readonly string[]).includes(status)
