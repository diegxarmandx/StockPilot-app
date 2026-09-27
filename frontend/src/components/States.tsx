import { AlertCircle, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Loading records">
      <span className="sr-only">Loading records…</span>
      <div className="skeleton skeleton-heading" aria-hidden="true" />
      {[0, 1, 2, 3].map((row) => (
        <div className="skeleton-row" key={row} aria-hidden="true">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ))}
    </div>
  )
}
export function ErrorState({
  message,
  retry,
  title = 'Unable to complete this request.',
}: {
  message: string
  retry?: () => void
  title?: string
}) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {retry && (
          <button className="button secondary mt-3" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={25} aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}
