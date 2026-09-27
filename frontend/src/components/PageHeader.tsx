import type { ReactNode } from 'react'
export function PageHeader({
  title,
  description,
  action,
  badge,
}: {
  title: string
  description: string
  action?: ReactNode
  badge?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div className="page-heading-copy">
        <div className="title-line">
          <h1>{title}</h1>
          {badge}
        </div>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-heading-actions">{action}</div>}
    </header>
  )
}
