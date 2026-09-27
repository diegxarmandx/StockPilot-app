import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'

export function LoadingState() {
  return (
    <div className="empty-state" role="status">
      <LoaderCircle className="animate-spin" size={24} />
      <p>Loading records…</p>
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>We couldn’t complete that request.</strong>
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

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}
