import type { CSSProperties, ReactNode } from 'react'

export type PageToolbarProps = {
  title: ReactNode
  actions?: ReactNode
  marginBottom?: number
  className?: string
  style?: CSSProperties
}

export function PageToolbar({
  title,
  actions,
  marginBottom = 24,
  className,
  style,
}: PageToolbarProps) {
  return (
    <div
      className={['crm-page-toolbar', className].filter(Boolean).join(' ')}
      style={{ marginBottom, ...style }}
    >
      <div className="crm-page-toolbar__title">{title}</div>
      {actions != null ? <div className="crm-page-toolbar__actions">{actions}</div> : null}
    </div>
  )
}
