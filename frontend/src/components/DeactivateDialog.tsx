import { useEffect, useRef } from 'react'
import { Archive } from 'lucide-react'

export function DeactivateDialog({
  name,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  name: string
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="deactivate-title"
      aria-describedby="deactivate-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <span className="empty-icon">
        <Archive size={24} />
      </span>
      <h2 id="deactivate-title">Deactivate this record?</h2>
      <p id="deactivate-description">
        <strong>{name}</strong> will be marked inactive. Its details will remain available, and you
        can reactivate it by editing the record.
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 mt-6">
        <button autoFocus className="button secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Deactivating…' : 'Deactivate record'}
        </button>
      </div>
    </dialog>
  )
}
